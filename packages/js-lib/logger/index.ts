type LogLevel = 'debug' | 'info' | 'warn' | 'error';

let GLOBAL_SILENCED = false;

export function silenceAllLoggers() {
  GLOBAL_SILENCED = true;
}

export function unSilenceAllLoggers() {
  GLOBAL_SILENCED = false;
}

export class Logger {
  private prefix: string;
  private localSilenced = false;

  get silenced() {
    return this.localSilenced || GLOBAL_SILENCED;
  }

  constructor(prefix = '') {
    this.prefix = prefix;
  }

  private log(level: LogLevel, ...message: any[]): void {
    if (level === 'error' || !this.silenced) {
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
    this.localSilenced = true;
  }
}
