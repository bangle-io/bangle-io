import {
  BaseService,
  type BaseServiceContext,
  throwAppError,
} from '@bangle.io/base-utils';
import {
  EDITOR_SAVE_DRAIN_TIMEOUT_MS,
  SERVICE_NAME,
} from '@bangle.io/constants';
import type { WsFilePath } from '@bangle.io/ws-path';
import type { FileSystemService } from './file-system-service';
import {
  type NoteRelocationReferenceRewriteWarning,
  planNoteRelocationReferenceRewrite,
} from './note-relocation-reference-rewrite';

export type NoteRelocationWarning =
  | NoteRelocationReferenceRewriteWarning
  | {
      kind:
        | 'destination-content-changed'
        | 'editor-content-unavailable'
        | 'newer-local-edit';
      skippedReferences: number;
    };

export type NoteRelocationRequest = Readonly<{
  destination: WsFilePath;
  source: WsFilePath;
}>;

export type NoteRelocationReceipt = Readonly<{
  destination: WsFilePath;
  rewrittenReferences: number;
  source: WsFilePath;
  warnings: readonly NoteRelocationWarning[];
}>;

/**
 * Engine-specific bridge for applying a relocation rewrite after the durable
 * move. Composition supplies the ProseMirror implementation; engines without
 * a safe writable handoff report `unavailable`.
 */
export type NoteRelocationEditorAdapter = {
  discardRelocatedMarkdownHandoff: (destinationWsPath: string) => void;
  writeRelocatedMarkdown: (params: {
    destinationWsPath: string;
    markdown: string;
    sourceWsPath: string;
  }) => Promise<'superseded' | 'unavailable' | 'written'>;
  waitForSourceSaveDrain: (
    wsPath: string,
    timeoutMs: number,
  ) => Promise<boolean>;
};

/**
 * Reports a failed post-rename content write and whether returning the only
 * remaining durable file to its original path succeeded.
 */
export class NoteRelocationContentWriteError extends Error {
  readonly compensation: 'failed' | 'restored';
  readonly compensationError: unknown;
  readonly destination: WsFilePath;
  readonly source: WsFilePath;
  readonly writeError: unknown;

  constructor({
    compensation,
    compensationError,
    destination,
    source,
    writeError,
  }: {
    compensation: 'failed' | 'restored';
    compensationError?: unknown;
    destination: WsFilePath;
    source: WsFilePath;
    writeError: unknown;
  }) {
    super(
      compensation === 'restored'
        ? 'Could not update the relocated note; it was restored to its original path'
        : 'Could not update the relocated note and could not restore its original path',
    );
    this.name = 'NoteRelocationContentWriteError';
    this.compensation = compensation;
    this.compensationError = compensationError;
    this.destination = destination;
    this.source = source;
    this.writeError = writeError;
  }
}

/**
 * Performs the durable, source-only portion of a Markdown note relocation.
 * Callers retain their existing metadata work (such as star migration) after
 * this service has completed successfully.
 */
export class NoteRelocationService extends BaseService {
  static deps = ['fileSystem'] as const;

  constructor(
    context: BaseServiceContext,
    private dependencies: {
      fileSystem: FileSystemService;
    },
    private config: {
      getEditorAdapter: () => NoteRelocationEditorAdapter;
    },
  ) {
    super(SERVICE_NAME.noteRelocationService, context, dependencies);
  }

  hookMount(): void {}

  async relocate({
    destination,
    source,
  }: NoteRelocationRequest): Promise<NoteRelocationReceipt> {
    source.assertMarkdown();
    destination.assertMarkdown();

    if (source.wsName !== destination.wsName) {
      throwAppError(
        'error::file:invalid-operation',
        'Cannot relocate a note across workspaces',
        {
          operation: 'relocate',
          oldWsPath: source.wsPath,
          newWsPath: destination.wsPath,
        },
      );
    }

    if (source.wsPath === destination.wsPath) {
      return this.receipt(source, destination, 0, []);
    }

    if (!(await this.dependencies.fileSystem.exists(source.wsPath))) {
      throwAppError(
        'error::file:invalid-note-path',
        'Cannot relocate a missing note',
        { invalidWsPath: source.wsPath },
      );
    }
    if (await this.dependencies.fileSystem.exists(destination.wsPath)) {
      throwAppError('error::file:already-existing', 'File already exists', {
        wsPath: destination.wsPath,
      });
    }

    const saved = await this.config
      .getEditorAdapter()
      .waitForSourceSaveDrain(source.wsPath, EDITOR_SAVE_DRAIN_TIMEOUT_MS);
    if (!saved) {
      throwAppError(
        'error::file:invalid-operation',
        'Cannot relocate a note with unsaved changes',
        {
          operation: 'relocate',
          oldWsPath: source.wsPath,
          newWsPath: destination.wsPath,
        },
      );
    }

    const markdown = await this.dependencies.fileSystem.readFileAsText(
      source.wsPath,
    );
    if (markdown === undefined) {
      throwAppError(
        'error::file:invalid-note-path',
        'Cannot relocate a missing note',
        { invalidWsPath: source.wsPath },
      );
    }
    const existingWsPaths =
      await this.dependencies.fileSystem.listWorkspaceFiles(
        source.wsName,
        this.abortSignal,
      );
    const rewrite = planNoteRelocationReferenceRewrite({
      destination,
      existingWsPaths,
      markdown,
      source,
    });

    await this.dependencies.fileSystem.renameFile({
      oldWsPath: source.wsPath,
      newWsPath: destination.wsPath,
    });

    if (rewrite.markdown === markdown) {
      return this.receipt(
        source,
        destination,
        rewrite.rewrittenReferences,
        rewrite.warnings,
      );
    }

    // A sync tool or another tab can change the source after planning but
    // before this rename. Never apply that stale plan over the moved bytes.
    const destinationMarkdown =
      await this.dependencies.fileSystem.readFileAsText(destination.wsPath);
    if (destinationMarkdown !== markdown) {
      return this.receipt(source, destination, 0, [
        ...rewrite.warnings,
        ...this.operationSkipWarning(
          'destination-content-changed',
          rewrite.rewrittenReferences,
        ),
      ]);
    }

    try {
      const writeResult = await this.config
        .getEditorAdapter()
        .writeRelocatedMarkdown({
          destinationWsPath: destination.wsPath,
          markdown: rewrite.markdown,
          sourceWsPath: source.wsPath,
        });
      if (writeResult === 'superseded') {
        return this.receipt(source, destination, 0, [
          ...rewrite.warnings,
          ...this.operationSkipWarning(
            'newer-local-edit',
            rewrite.rewrittenReferences,
          ),
        ]);
      }
      if (writeResult === 'unavailable') {
        return this.receipt(source, destination, 0, [
          ...rewrite.warnings,
          ...this.operationSkipWarning(
            'editor-content-unavailable',
            rewrite.rewrittenReferences,
          ),
        ]);
      }
    } catch (writeError) {
      try {
        await this.restoreSourceAfterWriteFailure({
          destination,
          source,
          writeError,
        });
      } finally {
        this.config
          .getEditorAdapter()
          .discardRelocatedMarkdownHandoff(destination.wsPath);
      }
    }

    return this.receipt(
      source,
      destination,
      rewrite.rewrittenReferences,
      rewrite.warnings,
    );
  }

  private receipt(
    source: WsFilePath,
    destination: WsFilePath,
    rewrittenReferences: number,
    warnings: readonly NoteRelocationWarning[],
  ): NoteRelocationReceipt {
    return { destination, rewrittenReferences, source, warnings };
  }

  private operationSkipWarning(
    kind: Extract<NoteRelocationWarning, { skippedReferences: number }>['kind'],
    skippedReferences: number,
  ): readonly NoteRelocationWarning[] {
    return skippedReferences === 0 ? [] : [{ kind, skippedReferences }];
  }

  private async restoreSourceAfterWriteFailure({
    destination,
    source,
    writeError,
  }: {
    destination: WsFilePath;
    source: WsFilePath;
    writeError: unknown;
  }): Promise<never> {
    try {
      await this.dependencies.fileSystem.renameFile({
        oldWsPath: destination.wsPath,
        newWsPath: source.wsPath,
      });
    } catch (compensationError) {
      throw new NoteRelocationContentWriteError({
        compensation: 'failed',
        compensationError,
        destination,
        source,
        writeError,
      });
    }

    throw new NoteRelocationContentWriteError({
      compensation: 'restored',
      destination,
      source,
      writeError,
    });
  }
}
