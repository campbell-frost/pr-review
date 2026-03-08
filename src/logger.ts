export type LogLevel = "debug" | "info" | "warn" | "error";

export interface ILogger {
  debug(message: string): void;
  info(message: string): void;
  warn(message: string): void;
  error(message: string, cause?: unknown): void;
}

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export class Logger implements ILogger {
  constructor(private readonly minLevel: LogLevel) {}

  debug(message: string): void {
    this.write("debug", message);
  }

  info(message: string): void {
    this.write("info", message);
  }

  warn(message: string): void {
    this.write("warn", message);
  }

  error(message: string, cause?: unknown): void {
    this.write("error", message);
    if (cause !== undefined) {
      const causeStr =
        cause instanceof Error ? cause.message : JSON.stringify(cause);
      this.write("error", causeStr);
    }
  }

  private write(level: LogLevel, message: string): void {
    if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[this.minLevel]) {
      return;
    }
    const timestamp = new Date().toISOString();
    process.stderr.write(`[${level.toUpperCase()}] ${timestamp} ${message}\n`);
  }
}
