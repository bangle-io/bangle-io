import type {
  EditorView,
  markdownLoader,
  Schema,
  Transaction,
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
/**
 * Backoff before the single trailing pass that runs when MAX_PASSES was
 * exhausted with work still pending. Writers commit their final state with
 * no follow-up record (the premise of the two-read protocol), so giving up
 * silently at the bound would leave the editor stale forever; one delayed,
 * non-re-arming retry covers the settle-after-the-bound case while keeping
 * total work per burst finite.
 */
const TRAILING_PASS_DELAY_MS = 1_000;

function sleep(ms: number, signal: AbortSignal | undefined): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve();
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      resolve();
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/**
 * Builds a save-suppressed, non-undoable replacement for externally sourced
 * content while preserving the selection near its previous position. Returns
 * undefined when applying a non-empty document would unexpectedly blank it.
 */
export function buildExternalDocReplace(
  view: EditorView,
  parsedDoc: EditorView['state']['doc'],
): Transaction | undefined {
  const { state } = view;
  const selectionHead = state.selection.head;
  let tr = state.tr.replaceWith(0, state.doc.content.size, parsedDoc.content);
  if (parsedDoc.content.size > 0 && tr.doc.content.size === 0) {
    return undefined;
  }
  tr = tr.setSelection(
    TextSelection.near(
      tr.doc.resolve(Math.min(selectionHead, tr.doc.content.size)),
    ),
  );
  return tr.setMeta('addToHistory', false);
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
  /** Exact disk source retained while this view's document is unchanged. */
  getRetainedSource(view: EditorView): string | undefined;
  /**
   * Preserves the current source, re-checks that the editor is still safe to
   * replace, applies the transaction without re-saving it, and records the
   * newly loaded source baseline.
   */
  replaceContent(args: {
    currentSerialized: string;
    expectedDoc: EditorView['state']['doc'];
    sourceMarkdown: string;
    transaction: Transaction;
    view: EditorView;
    wsPath: string;
  }): Promise<'applied' | 'retry' | 'skipped'>;
  /**
   * The disk copy of `wsPath` was confirmed stable and different, but was
   * refused (fidelity, emptied-file, schema, or parse refusal) — the open
   * editor now knowingly shows older content than disk. Hosts surface this
   * to the user with a recovery path; the refusal itself is deliberate.
   */
  onStaleContentRefused(wsPath: string): void;
  /**
   * A later pass reconciled `wsPath` — external content was applied, or
   * disk and editor turned out equal — so any stale-content notice for the
   * path can be withdrawn.
   */
  onContentReconciled(wsPath: string): void;
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
 * - applied content stays out of the undo stack and is not re-saved;
 * - refusals are reported to the host so the user learns the editor is
 *   deliberately showing older content than disk.
 */
export class ExternalContentSync {
  /**
   * wsPaths with a sync pass in flight; the boolean marks whether another
   * external event arrived meanwhile and the pass must run again. Only
   * `handleEvent`/`syncPath` write it — passes report their own rerun needs
   * through `applyIfClean`'s return value.
   */
  private runs = new Map<string, boolean>();

  constructor(
    private host: ExternalContentSyncHost,
    /** Service lifetime; in-flight passes stop when it aborts. */
    private signal?: AbortSignal,
  ) {}

  private get aborted(): boolean {
    return this.signal?.aborted === true;
  }

  handleEvent(event: ExternalFileChangeEvent): void {
    let targets: string[];
    switch (event.type) {
      case 'file-content-update':
      case 'file-create': {
        targets =
          this.host.getViews(event.wsPath).length > 0 ? [event.wsPath] : [];
        break;
      }
      case 'refresh': {
        // A refresh scoped to a workspace only reconciles that workspace's
        // editors; an app-wide refresh (no wsName) reconciles everything.
        targets = this.host.getMountedWsPaths(event.wsName);
        break;
      }
      default: {
        // Deletes change the tree, not the open document's content. An open
        // editor on the removed path keeps the user's content; its next save
        // fails visibly through the save-error surface rather than silently
        // recreating the file here.
        targets = [];
      }
    }
    for (const wsPath of targets) {
      void this.syncPath(wsPath).catch((error) => {
        if (this.aborted) {
          // Teardown mid-pass; reads racing the abort are expected to fail.
          return;
        }
        this.host.logger.warn(
          `Failed to refresh editor from external change: ${wsPath}`,
          error,
        );
      });
    }
  }

  private async syncPath(
    wsPath: string,
    isTrailingPass = false,
  ): Promise<void> {
    if (this.runs.has(wsPath)) {
      // A pass is already in flight — ask it to run once more so the final
      // external state is not dropped.
      this.runs.set(wsPath, true);
      return;
    }
    this.runs.set(wsPath, false);
    let passes = 0;
    let pendingWork = false;
    try {
      do {
        this.runs.set(wsPath, false);
        passes += 1;
        const wantsRerun = await this.applyIfClean(wsPath);
        pendingWork = wantsRerun || this.runs.get(wsPath) === true;
      } while (pendingWork && passes < MAX_PASSES && !this.aborted);
    } finally {
      this.runs.delete(wsPath);
    }

    if (!pendingWork || this.aborted) {
      return;
    }
    // MAX_PASSES exhausted with work still pending. The writer's final
    // commit may produce no further watcher record, so give the file one
    // delayed, fresh chance to settle — but never re-arm from within that
    // trailing pass, keeping per-burst work finite for a file under truly
    // continuous external writes.
    if (isTrailingPass) {
      this.host.logger.warn(
        `External content for ${wsPath} kept changing; giving up until the next external event`,
      );
      return;
    }
    await sleep(TRAILING_PASS_DELAY_MS, this.signal);
    if (this.aborted) {
      return;
    }
    await this.syncPath(wsPath, true);
  }

  /**
   * Runs one reconciliation pass. Returns true when the pass could not
   * settle (mid-write reads disagreed, or a view was busy composing) and
   * the caller should run another pass.
   */
  private async applyIfClean(wsPath: string): Promise<boolean> {
    // Unsaved or failed-to-save local edits always win: replacing the doc
    // would destroy content that exists nowhere else.
    if (this.host.hasPendingSaves(wsPath)) {
      return false;
    }
    const views = this.host.getViews(wsPath);
    if (views.length === 0) {
      return false;
    }
    const docsBefore = views.map((view) => view.state.doc);

    // Watcher records are hints that can fire mid-write: a sync tool (or the
    // browser's own writable stream) may truncate the file before the new
    // bytes land, with no follow-up record for the final commit. Wait out a
    // short quiet period, then require two consecutive reads to agree before
    // treating the content as settled — otherwise an open note would flash
    // (or stick) empty on a truncate-then-write.
    await sleep(QUIET_MS, this.signal);
    if (this.aborted) {
      return false;
    }
    const firstRead = await this.host.readFileAsText(wsPath);
    if (firstRead === undefined || this.aborted) {
      return false;
    }
    await sleep(STABILITY_MS, this.signal);
    if (this.aborted) {
      return false;
    }
    const diskText = await this.host.readFileAsText(wsPath);
    if (diskText === undefined || this.aborted) {
      return false;
    }
    if (diskText !== firstRead) {
      // Still being written — ask for another pass.
      return true;
    }
    // The user may have typed while the reads were in flight — re-check, and
    // bail if any doc moved on. A newer watcher event re-triggers this pass.
    if (this.host.hasPendingSaves(wsPath)) {
      return false;
    }

    let needsRerun = false;
    let refused = false;
    let reconciled = false;
    for (const [index, view] of views.entries()) {
      if (view.isDestroyed || view.state.doc !== docsBefore[index]) {
        continue;
      }
      if (view.composing) {
        // Replacing the doc mid-IME-composition aborts the composition and
        // silently drops the user's uncommitted keystrokes. Retry after the
        // burst; once composition commits, the resulting save re-triggers
        // reconciliation anyway.
        needsRerun = true;
        continue;
      }
      const markdown = this.host.getMarkdown(view.state.schema);
      let parsed: ReturnType<typeof markdown.parser.parse>;
      let currentSerialized: string;
      let diskSerialized: string;
      try {
        parsed = markdown.parser.parse(diskText);
        // Compare through the serializer so normalization differences (e.g.
        // list markers) don't register as changes; equal content means this
        // is our own echo or a no-op and the editor is left untouched.
        currentSerialized = markdown.serializer.serialize(view.state.doc);
        diskSerialized = markdown.serializer.serialize(parsed);
      } catch (error) {
        // A parse or serialize failure must never touch the editor (or
        // disk) — the user keeps their current view of the note, and the
        // remaining views still get their chance.
        this.host.logger.warn(
          `Could not parse or compare externally changed content for ${wsPath}`,
          error,
        );
        refused = true;
        continue;
      }
      // A coarse refresh also visits unchanged notes. Lossy Markdown cannot
      // equal its serializer output, so recognize the exact retained source
      // before treating serializer-equal content as a changed lossy source.
      const retainedSource = this.host.getRetainedSource(view);
      if (
        currentSerialized === diskSerialized &&
        retainedSource !== undefined &&
        isMarkdownRoundTripPreserved(diskText, retainedSource)
      ) {
        reconciled = true;
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
        refused = true;
        continue;
      }
      if (currentSerialized === diskSerialized) {
        reconciled = true;
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
        refused = true;
        continue;
      }

      const tr = buildExternalDocReplace(view, parsed);
      // Defense in depth: if the replacement lost the parsed content (e.g. a
      // schema mismatch), never apply it — a wrong-but-present note beats a
      // blanked one.
      if (!tr) {
        this.host.logger.error(
          `External sync for ${wsPath} produced an empty document from non-empty content; skipping`,
        );
        refused = true;
        continue;
      }

      const result = await this.host.replaceContent({
        currentSerialized,
        expectedDoc: docsBefore[index],
        sourceMarkdown: diskText,
        transaction: tr,
        view,
        wsPath,
      });
      if (this.aborted) {
        return false;
      }
      if (result === 'retry') {
        needsRerun = true;
      } else if (result === 'applied') {
        reconciled = true;
      }
    }

    // One outcome per pass: a refusal outranks a reconciliation (the user
    // should learn about the diverged view even if another view applied).
    if (refused) {
      this.host.onStaleContentRefused(wsPath);
    } else if (reconciled) {
      this.host.onContentReconciled(wsPath);
    }
    return needsRerun;
  }
}
