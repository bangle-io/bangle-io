import type {
  EditorView,
  markdownLoader,
  Schema,
  Transaction,
} from '@bangle.io/prosemirror-plugins';
import { TextSelection } from '@bangle.io/prosemirror-plugins';
import type { ExternalFileChangeEvent } from '@bangle.io/service-core';
import {
  collectLinkTargets,
  isMarkdownContentPreserved,
  isMarkdownRoundTripPreserved,
} from './round-trip-check';

/**
 * Quiet period between an external change notification and the first disk
 * read, letting in-progress writes (truncate-then-write) finish first.
 */
export const QUIET_MS = 150;
/**
 * Gap between the two confirming reads that must agree before externally
 * changed content is applied to an open editor.
 */
export const STABILITY_MS = 100;
/**
 * How long a test must wait before "the editor did not change" proves a
 * refusal rather than the pass simply not having run yet. Exported so those
 * negative assertions cannot quietly go vacuous when the timings above are
 * tuned.
 */
export const RECONCILE_SETTLE_MS = (QUIET_MS + STABILITY_MS) * 2 + 150;
/** Back-to-back passes before backing off, for a writer that settles quickly. */
const PASSES_BEFORE_BACKOFF = 5;
/**
 * Upper bound on passes per event burst so a file under continuous external
 * writes cannot spin the sync loop forever; the next watcher event starts a
 * fresh sync.
 */
const MAX_PASSES = 10;
/**
 * Backoff before the remaining passes. A writer may settle without producing
 * another watcher event, so the fast passes cannot simply give up.
 */
const TRAILING_RETRY_DELAY_MS = 1_000;

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
function buildExternalDocReplace(
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
   * Preserves `preservableSource`, re-checks that the editor is still safe to
   * replace, applies the transaction without re-saving it, and records the
   * newly loaded source baseline. `refused` means the editor's own content
   * could not be preserved, so replacing it would lose it for good.
   */
  replaceContent(args: {
    expectedDoc: EditorView['state']['doc'];
    /** What to keep recoverable before the editor is overwritten. */
    preservableSource: string;
    sourceMarkdown: string;
    transaction: Transaction;
    view: EditorView;
    wsPath: string;
  }): Promise<'applied' | 'refused' | 'retry' | 'skipped'>;
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

export type DiskVersionApplyResult = {
  /** How many mounted views were replaced. */
  appliedCount: number;
  content?: string;
  retry: boolean;
  unavailable: boolean;
};

type ReconcileMode = 'automatic' | 'user-approved';

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
   * through `reconcileOnce`'s return value.
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

  /**
   * Applies the current disk version after explicit user consent. This shares
   * the dirty-edit, composition, parsing, and replacement lifecycle with
   * automatic reconciliation, while bypassing its fidelity and empty-file
   * refusals.
   *
   * Two deliberate differences from the automatic path:
   * - it reads once instead of requiring two agreeing reads, so consenting
   *   while a writer is mid-write can load a truncated file. The editor's own
   *   copy is snapshotted first, so that stays recoverable, and making the
   *   user wait out a stability protocol for an explicit action is worse than
   *   the rare bad read;
   * - it runs outside `runs`, so it can interleave with an automatic pass.
   *   Whichever applies first changes the doc, and the loser's `expectedDoc`
   *   check turns it into a no-op.
   */
  acceptDiskVersion(wsPath: string): Promise<DiskVersionApplyResult> {
    return this.reconcileOnce(wsPath, 'user-approved');
  }

  private async syncPath(wsPath: string): Promise<void> {
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
        if (passes === PASSES_BEFORE_BACKOFF) {
          await sleep(TRAILING_RETRY_DELAY_MS, this.signal);
          if (this.aborted) {
            return;
          }
        }
        this.runs.set(wsPath, false);
        passes += 1;
        const result = await this.reconcileOnce(wsPath, 'automatic');
        pendingWork = result.retry || this.runs.get(wsPath) === true;
      } while (pendingWork && passes < MAX_PASSES && !this.aborted);
      if (pendingWork && !this.aborted) {
        this.host.logger.warn(
          `External content for ${wsPath} kept changing; giving up until the next external event`,
        );
      }
    } finally {
      this.runs.delete(wsPath);
    }
  }

  private async reconcileOnce(
    wsPath: string,
    mode: ReconcileMode,
  ): Promise<DiskVersionApplyResult> {
    const outcome: DiskVersionApplyResult = {
      appliedCount: 0,
      retry: false,
      unavailable: false,
    };

    // Unsaved or failed-to-save local edits always win: replacing the doc
    // would destroy content that exists nowhere else.
    if (this.host.hasPendingSaves(wsPath)) {
      return outcome;
    }
    const views = this.host.getViews(wsPath);
    if (views.length === 0) {
      return outcome;
    }
    const docsBefore = views.map((view) => view.state.doc);

    let diskText: string | undefined;
    if (mode === 'automatic') {
      // Watcher records can fire mid-write. Wait briefly, then require two
      // consecutive reads to agree before treating the content as settled.
      await sleep(QUIET_MS, this.signal);
      if (this.aborted) {
        return outcome;
      }
      const firstRead = await this.host.readFileAsText(wsPath);
      if (firstRead === undefined || this.aborted) {
        return outcome;
      }
      await sleep(STABILITY_MS, this.signal);
      if (this.aborted) {
        return outcome;
      }
      diskText = await this.host.readFileAsText(wsPath);
      if (diskText === undefined || this.aborted) {
        return outcome;
      }
      if (diskText !== firstRead) {
        outcome.retry = true;
        return outcome;
      }
    } else {
      diskText = await this.host.readFileAsText(wsPath);
      if (diskText === undefined || this.aborted) {
        outcome.unavailable = true;
        return outcome;
      }
    }
    outcome.content = diskText;

    // The user may have typed while disk was being read.
    if (this.host.hasPendingSaves(wsPath)) {
      return outcome;
    }

    let refused = false;
    let reconciled = false;
    for (const [index, view] of views.entries()) {
      if (view.isDestroyed || view.state.doc !== docsBefore[index]) {
        continue;
      }
      if (view.composing) {
        // Replacing the doc mid-composition silently drops uncommitted input.
        outcome.retry = true;
        continue;
      }

      const markdown = this.host.getMarkdown(view.state.schema);
      let parsed: ReturnType<typeof markdown.parser.parse>;
      let currentSerialized: string;
      try {
        parsed = markdown.parser.parse(diskText);
        currentSerialized = markdown.serializer.serialize(view.state.doc);
      } catch (error) {
        if (mode === 'user-approved') {
          throw error;
        }
        this.host.logger.warn(
          `Could not parse or compare externally changed content for ${wsPath}`,
          error,
        );
        refused = true;
        continue;
      }

      // While the document is unchanged since load, the exact bytes it was
      // parsed from are what must be preserved — a re-serialization would
      // normalize away Markdown the editor cannot round-trip.
      const retainedSource = this.host.getRetainedSource(view);

      if (mode === 'automatic') {
        let diskSerialized: string;
        try {
          diskSerialized = markdown.serializer.serialize(parsed);
        } catch (error) {
          this.host.logger.warn(
            `Could not serialize externally changed content for ${wsPath}`,
            error,
          );
          refused = true;
          continue;
        }
        // Serializer comparison coalesces echoes and normalization-only
        // differences. Retained source recognizes unchanged lossy Markdown.
        if (
          currentSerialized === diskSerialized &&
          retainedSource !== undefined &&
          isMarkdownRoundTripPreserved(diskText, retainedSource)
        ) {
          reconciled = true;
          continue;
        }
        // Applying writes nothing, so the question is not "would saving
        // rewrite this file?" (pure normalization would, and the fidelity
        // notice already says so) but "did parsing lose anything the user can
        // see?". Only the latter justifies showing older content than disk.
        // The two tests are not nested: a fenced code block that merely
        // contains a definition-shaped line is byte-identical yet fails the
        // content test, so either one passing is enough.
        if (
          !isMarkdownRoundTripPreserved(diskText, diskSerialized) &&
          !isMarkdownContentPreserved(diskText, collectLinkTargets(parsed))
        ) {
          this.host.logger.warn(
            `Parsing the external change to ${wsPath} dropped content; not auto-applying`,
          );
          refused = true;
          continue;
        }
        if (currentSerialized === diskSerialized) {
          reconciled = true;
          continue;
        }
        // Agreeing reads can both land inside a writer's truncated state.
        // Never automatically blank a non-empty editor.
        if (diskText.trim() === '' && currentSerialized.trim() !== '') {
          this.host.logger.warn(
            `External change emptied ${wsPath}; keeping the editor content`,
          );
          refused = true;
          continue;
        }
      }

      const transaction = buildExternalDocReplace(view, parsed);
      if (!transaction) {
        this.host.logger.error(
          `External sync for ${wsPath} produced an empty document from non-empty content; skipping`,
        );
        refused = true;
        continue;
      }

      const replaceResult = await this.host.replaceContent({
        expectedDoc: docsBefore[index],
        preservableSource: retainedSource ?? currentSerialized,
        sourceMarkdown: diskText,
        transaction,
        view,
        wsPath,
      });
      if (this.aborted) {
        return outcome;
      }
      if (replaceResult === 'retry') {
        outcome.retry = true;
      } else if (replaceResult === 'refused') {
        refused = true;
      } else if (replaceResult === 'applied') {
        outcome.appliedCount += 1;
        reconciled = true;
      }
    }

    if (mode === 'automatic') {
      // A refusal outranks a reconciliation: one diverged view is actionable.
      if (refused) {
        this.host.onStaleContentRefused(wsPath);
      } else if (reconciled) {
        this.host.onContentReconciled(wsPath);
      }
    }
    return outcome;
  }
}
