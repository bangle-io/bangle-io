export type AppError =
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
  | {
      name: `error::database:unknown-error`;
      payload: {
        error: Error;
        databaseName: string;
      };
    }

  // workspace
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
      name: `error::workspace:unknown-error`;
      payload: {
        wsName: string;
        error: Error;
      };
    }
  | {
      name: `error::workspace:corrupted`;
      payload: {
        wsName: string;
      };
    }
  | {
      name: `error::workspace:misc-table`;
      payload: {
        info: string;
      };
    };
