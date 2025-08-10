export interface Logger {
  debug(message: string, meta?: unknown): void;
  info(message: string, meta?: unknown): void;
  warn(message: string, meta?: unknown): void;
  error(message: string, meta?: unknown): void;
}

export type LogLevel = "debug" | "info" | "warn" | "error" | "none";

export class ConsoleLogger implements Logger {
  private level: LogLevel;

  constructor(level: LogLevel = "none") {
    this.level = level;
  }

  private shouldLog(target: Exclude<LogLevel, "none">): boolean {
    const order: Record<Exclude<LogLevel, "none">, number> = {
      debug: 10,
      info: 20,
      warn: 30,
      error: 40,
    };

    if (this.level === "none") return false;
    const currentLevel = this.level as Exclude<LogLevel, "none">;
    return order[target] >= order[currentLevel];
  }

  debug(message: string, meta?: unknown): void {
    if (this.shouldLog("debug")) {
      // eslint-disable-next-line no-console
      console.debug(message, meta ?? "");
    }
  }

  info(message: string, meta?: unknown): void {
    if (this.shouldLog("info")) {
      // eslint-disable-next-line no-console
      console.info(message, meta ?? "");
    }
  }

  warn(message: string, meta?: unknown): void {
    if (this.shouldLog("warn")) {
      // eslint-disable-next-line no-console
      console.warn(message, meta ?? "");
    }
  }

  error(message: string, meta?: unknown): void {
    if (this.shouldLog("error")) {
      // eslint-disable-next-line no-console
      console.error(message, meta ?? "");
    }
  }
}
