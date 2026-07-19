type LogLevelName = 'debug' | 'info' | 'warn' | 'error';
type LoggerConsole = Pick<Console, LogLevelName>;

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
    private loggerConsole: LoggerConsole = console,
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

  private log(level: LogLevelName, ...message: unknown[]): void {
    if (this.shouldLog(level)) {
      this.loggerConsole[level](`[${this.prefix}]`, ...message);
    }
  }

  public debug(...message: unknown[]): void {
    this.log('debug', ...message);
  }

  public info(...message: unknown[]): void {
    this.log('info', ...message);
  }

  public warn(...message: unknown[]): void {
    this.log('warn', ...message);
  }

  public error(...message: unknown[]): void {
    this.log('error', ...message);

    // Report the first Error regardless of its position. Callers often lead
    // with a static diagnostic label; the reporting boundary itself converts
    // the Error into a privacy-safe allowlisted payload.
    const error = message.find((item): item is Error => item instanceof Error);
    if (errorReporter && error) {
      errorReporter.captureException(error);
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
