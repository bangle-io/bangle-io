type LogLevelName = 'debug' | 'info' | 'warn' | 'error';

const LogLevelPriority: { [key in LogLevelName]: number } = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

let GLOBAL_LOG_LEVEL: LogLevelName = 'info';

// Type for external error reporting service
export type ErrorReporter = {
  captureException: (error: Error) => void;
};

// Global error reporter instance, can be set by applications
let errorReporter: ErrorReporter | null = null;

export function setGlobalLogLevel(level: LogLevelName) {
  GLOBAL_LOG_LEVEL = level;
}

export function setErrorReporter(reporter: ErrorReporter) {
  errorReporter = reporter;
}

export class Logger {
  constructor(
    private prefix = '',
    private localLogLevel: LogLevelName | null = null,
    private loggerConsole = console,
  ) {}

  /**
   * Creates a child logger with an extended prefix.
   * @param additionalPrefix The prefix to append.
   * @returns A new Logger instance with the combined prefix and optional log level.
   */
  public child(additionalPrefix: string): Logger {
    const newPrefix = this.prefix
      ? `${this.prefix}:${additionalPrefix}`
      : additionalPrefix;
    return new Logger(newPrefix, this.localLogLevel, this.loggerConsole);
  }

  private get effectiveLogLevel(): LogLevelName {
    return this.localLogLevel || GLOBAL_LOG_LEVEL;
  }

  private shouldLog(level: LogLevelName): boolean {
    return LogLevelPriority[level] >= LogLevelPriority[this.effectiveLogLevel];
  }

  private log(level: LogLevelName, ...message: any[]): void {
    if (this.shouldLog(level)) {
      this.loggerConsole[level](`[${this.prefix}]`, ...message);
    }
  }

  public debug(...message: any[]): void {
    this.log('debug', ...message);
  }

  public info(...message: any[]): void {
    this.log('info', ...message);
  }

  public warn(...message: any[]): void {
    this.log('warn', ...message);
  }

  public error(...message: any[]): void {
    this.log('error', ...message);

    // If the first message is an Error instance, send it to the error reporter
    if (errorReporter && message.length > 0 && message[0] instanceof Error) {
      errorReporter.captureException(message[0]);
    }
  }

  /**
   * Sets the local log level for this logger.
   * @param level The log level to set.
   */
  public setLogLevel(level: LogLevelName): void {
    this.localLogLevel = level;
  }
}
