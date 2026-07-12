import type {
  EditorView,
  markdownLoader,
  Schema,
} from '@bangle.io/prosemirror-plugins';
import { TextSelection } from '@bangle.io/prosemirror-plugins';
import type { ExternalFileChangeEvent } from '@bangle.io/service-core';
import { isMarkdownRoundTripPreserved } from './round-trip-check';

/**
 * Quiet period between an external change notification and the first disk
 * read, letting in-progress writes (truncate-then-write) finish first.
 */
const QUIET_MS = 150;
/**
 * Gap between the two confirming reads that must agree before externally
 * changed content is applied to an open editor.
 */
const STABILITY_MS = 100;
/**
 * Upper bound on re-runs per event burst so a file under continuous external
 * writes cannot spin the sync loop forever; the next watcher event starts a
 * fresh sync.
 */
const MAX_PASSES = 5;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * The slice of the editor service that external-disk reconciliation needs.
 * Kept narrow so the sync logic can be tested with a fake host and cannot
 * reach into unrelated editor state.
 */
export interface ExternalContentSyncHost {
  /** Ready, non-destroyed views currently showing `wsPath`. */
  getViews(wsPath: string): EditorView[];
  /**
   * wsPaths of all mounted, ready editors — scoped to one workspace when
   * `wsName` is given.
   */
  getMountedWsPaths(wsName?: string): string[];
  /** Whether unsaved or failed-to-save local edits exist for the path. */
  hasPendingSaves(wsPath: string): boolean;
  readFileAsText(wsPath: string): Promise<string | undefined>;
  getMarkdown(schema: Schema): ReturnType<typeof markdownLoader>;
  /**
   * Runs `dispatch` with the editor's save pipeline suppressed for `wsPath`,
   * so applying external content is not re-saved (a no-op write would churn
   * the file's mtime and make sync tools loop on their own change).
   */
  withSaveSuppressed(wsPath: string, dispatch: () => void): void;
  logger: {
    warn(...args: unknown[]): void;
    error(...args: unknown[]): void;
  };
}

/**
 * Reconciles open editors with files changed outside this app instance
 * (sync tools, other editors), without ever losing user work:
 *
 * - unsaved or failed-to-save local edits always win over the external copy;
 * - watcher events are treated as hints — content is only applied once two
 *   consecutive reads agree, tolerating truncate-then-write writers;
 * - echoes and normalization no-ops are coalesced by serializer-level
 *   comparison and never touch the editor;
 * - a replacement that lost the parsed content (schema mismatch) is refused;
 * - applied content stays out of the undo stack and is not re-saved.
 */
export class ExternalContentSync {
  /**
   * wsPaths with a sync pass in flight; the boolean marks whether another
   * external event arrived meanwhile and the pass must run again.
   */
  private runs = new Map<string, boolean>();

  constructor(private host: ExternalContentSyncHost) {}

  handleEvent(event: ExternalFileChangeEvent): void {
    let targets: string[];
    switch (event.type) {
      case 'file-content-update':
      case 'file-create': {
        targets =
          event.wsPath !== undefined &&
          this.host.getViews(event.wsPath).length > 0
            ? [event.wsPath]
            : [];
        break;
      }
      case 'refresh': {
        // A refresh scoped to a workspace only reconciles that workspace's
        // editors; an app-wide refresh (no wsName) reconciles everything.
        targets = this.host.getMountedWsPaths(event.wsName);
        break;
      }
      default: {
        // Deletes/renames change the tree, not the open document's content.
        targets = [];
      }
    }
    for (const wsPath of targets) {
      void this.syncPath(wsPath).catch((error) => {
        this.host.logger.warn(
          `Failed to refresh editor from external change: ${wsPath}`,
          error,
        );
      });
    }
  }

  private async syncPath(wsPath: string): Promise<void> {
    const running = this.runs.get(wsPath);
    if (running !== undefined) {
      // A pass is already in flight — ask it to run once more so the final
      // external state is not dropped.
      this.runs.set(wsPath, true);
      return;
    }
    this.runs.set(wsPath, false);
    let passes = 0;
    try {
      do {
        this.runs.set(wsPath, false);
        passes += 1;
        await this.applyIfClean(wsPath);
      } while (this.runs.get(wsPath) && passes < MAX_PASSES);
    } finally {
      this.runs.delete(wsPath);
    }
  }

  private async applyIfClean(wsPath: string): Promise<void> {
    // Unsaved or failed-to-save local edits always win: replacing the doc
    // would destroy content that exists nowhere else.
    if (this.host.hasPendingSaves(wsPath)) {
      return;
    }
    const views = this.host.getViews(wsPath);
    if (views.length === 0) {
      return;
    }
    const docsBefore = views.map((view) => view.state.doc);

    // Watcher records are hints that can fire mid-write: a sync tool (or the
    // browser's own writable stream) may truncate the file before the new
    // bytes land, with no follow-up record for the final commit. Wait out a
    // short quiet period, then require two consecutive reads to agree before
    // treating the content as settled — otherwise an open note would flash
    // (or stick) empty on a truncate-then-write.
    await sleep(QUIET_MS);
    const firstRead = await this.host.readFileAsText(wsPath);
    if (firstRead === undefined) {
      return;
    }
    await sleep(STABILITY_MS);
    const diskText = await this.host.readFileAsText(wsPath);
    if (diskText === undefined) {
      return;
    }
    if (diskText !== firstRead) {
      // Still being written — run another pass after the loop's rerun check.
      this.runs.set(wsPath, true);
      return;
    }
    // The user may have typed while the reads were in flight — re-check, and
    // bail if any doc moved on. A newer watcher event re-triggers this pass.
    if (this.host.hasPendingSaves(wsPath)) {
      return;
    }

    for (const [index, view] of views.entries()) {
      if (view.isDestroyed || view.state.doc !== docsBefore[index]) {
        continue;
      }
      const markdown = this.host.getMarkdown(view.state.schema);
      let parsed: ReturnType<typeof markdown.parser.parse>;
      try {
        parsed = markdown.parser.parse(diskText);
      } catch (error) {
        // A parse failure must never touch the editor (or disk) — the user
        // keeps their current view of the note.
        this.host.logger.warn(
          `Could not parse externally changed content for ${wsPath}`,
          error,
        );
        continue;
      }
      // Compare through the serializer so normalization differences (e.g.
      // list markers) don't register as changes; equal content means this is
      // our own echo or a no-op and the editor is left untouched.
      const currentSerialized = markdown.serializer.serialize(view.state.doc);
      const diskSerialized = markdown.serializer.serialize(parsed);
      if (currentSerialized === diskSerialized) {
        continue;
      }
      // Same fidelity gate as initial note loading: if the external Markdown
      // does not round-trip exactly (footnotes, reference links, other
      // constructs the schema rewrites), applying it would put a lossy doc in
      // the editor and the user's next keystroke would save that loss to
      // disk. Leave the editor as-is; opening the note goes through the load
      // path, which surfaces the fidelity warning.
      if (!isMarkdownRoundTripPreserved(diskText, diskSerialized)) {
        this.host.logger.warn(
          `External change to ${wsPath} does not round-trip through the editor; not auto-applying`,
        );
        continue;
      }
      // Two agreeing reads can still both land inside a truncate-then-write
      // writer's truncated state. Blanking a non-empty note is the one
      // destructive shape of that race, so never auto-apply it — a genuine
      // external clear still shows after the writer's next event with real
      // content, or on reload.
      if (diskText.trim() === '' && currentSerialized.trim() !== '') {
        this.host.logger.warn(
          `External change emptied ${wsPath}; keeping the editor content`,
        );
        continue;
      }

      const { state } = view;
      const selectionHead = state.selection.head;
      let tr = state.tr.replaceWith(0, state.doc.content.size, parsed.content);
      // Defense in depth: if the replacement lost the parsed content (e.g.
      // a schema mismatch makes the replace fitting drop foreign nodes),
      // never apply it — a wrong-but-present note beats a blanked one.
      if (parsed.content.size > 0 && tr.doc.content.size === 0) {
        this.host.logger.error(
          `External sync for ${wsPath} produced an empty document from non-empty content; skipping`,
        );
        continue;
      }
      tr = tr.setSelection(
        TextSelection.near(
          tr.doc.resolve(Math.min(selectionHead, tr.doc.content.size)),
        ),
      );
      // External content is not a user edit: keep it out of the undo stack
      // (undoing it locally would fight the sync tool).
      tr = tr.setMeta('addToHistory', false);

      this.host.withSaveSuppressed(wsPath, () => {
        view.dispatch(tr);
      });
    }
  }
}
