type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export class Logger {
  private prefix: string;
  private silenced = false;
  constructor(prefix = '') {
    this.prefix = prefix;
  }

  private log(level: LogLevel, ...message: any[]): void {
    if (!this.silenced) {
      console[level](`[${this.prefix}] :`, ...message);
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

  public setPrefix(newPrefix: string): void {
    this.prefix = newPrefix;
  }

  public silence(val = true): void {
    this.silenced = true;
  }
}
