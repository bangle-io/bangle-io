export type AppError =
  // General main errors
  | {
      name: `error::main:unknown`;
      payload: {
        details?: string;
      };
    }
  | {
      name: `error::main:network`;
      payload: {
        details?: string;
      };
    }
  // Database errors
  | {
      name: `error::database:unknown-error`;
      payload: {
        error: Error;
        databaseName: string;
      };
    }
  // Workspace errors
  | {
      name: `error::workspace:already-exists`;
      payload: {
        wsName: string;
      };
    }
  | {
      name: `error::workspace:not-found`;
      payload: {
        wsName: string;
      };
    }
  | {
      name: `error::workspace:invalid-metadata`;
      payload: {
        wsName: string;
      };
    }
  | {
      name: `error::workspace:invalid-misc-data`;
      payload: {
        info: string;
      };
    }
  | {
      name: `error::workspace:not-allowed`;
      payload: {
        wsName?: string;
        operation: string;
        oldWsPath?: string;
        newWsPath?: string;
      };
    }
  // File errors
  | {
      name: `error::file:invalid-note-path`;
      payload: {
        invalidWsPath: string;
      };
    }
  | {
      name: `error::file:invalid-operation`;
      payload: {
        operation: string;
        oldWsPath: string;
        newWsPath: string;
      };
    }

  // File storage
  | {
      name: `error::file-storage:file-does-not-exist`;
      payload: {
        wsPath: string;
        storage: string;
      };
    }
  // WS Path errors
  | {
      name: `error::ws-path:invalid-ws-path`;
      payload: {
        invalidPath: string;
      };
    }
  | {
      name: `error::ws-path:create-new-note`;
      payload: {
        invalidWsPath: string;
      };
    };
