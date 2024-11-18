type LogLevelName = 'debug' | 'info' | 'warn' | 'error';

const LogLevelPriority: { [key in LogLevelName]: number } = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

let GLOBAL_LOG_LEVEL: LogLevelName = 'info';

export function setGlobalLogLevel(level: LogLevelName) {
  GLOBAL_LOG_LEVEL = level;
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
  }

  /**
   * Sets the local log level for this logger.
   * @param level The log level to set.
   */
  public setLogLevel(level: LogLevelName): void {
    this.localLogLevel = level;
  }
}
