export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

export interface LoggerOptions {
  component: string;
  minLevel?: LogLevel;
  forceEnabled?: boolean;
}

export class Logger {
  private component: string;
  private minLevel: LogLevel;
  private forceEnabled: boolean;

  constructor(options: LoggerOptions) {
    this.component = options.component;
    this.minLevel = options.minLevel ?? LogLevel.INFO;
    this.forceEnabled = options.forceEnabled ?? false;
  }

  public createChild(childComponent: string): Logger {
    return new Logger({
      component: `${this.component}:${childComponent}`,
      minLevel: this.minLevel,
      forceEnabled: this.forceEnabled,
    });
  }

  public setLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  public debug(message: string, data?: any): void {
    this.log(message, data, LogLevel.DEBUG);
  }

  public info(message: string, data?: any): void {
    this.log(message, data, LogLevel.INFO);
  }

  public warn(message: string, data?: any): void {
    this.log(message, data, LogLevel.WARN);
  }

  public error(message: string, data?: any): void {
    this.log(message, data, LogLevel.ERROR);
  }

  private log(
    message: string,
    data?: any,
    level: LogLevel = LogLevel.INFO
  ): void {
    if (!this.forceEnabled && level < this.minLevel) {
      return;
    }

    const prefix = `[${this.component}]`;
    const formattedMessage = `${prefix} ${message}`;

    switch (level) {
      case LogLevel.DEBUG:
        if (data !== undefined) {
          console.debug(formattedMessage, data);
        } else {
          console.debug(formattedMessage);
        }
        break;
      case LogLevel.INFO:
        if (data !== undefined) {
          console.log(formattedMessage, data);
        } else {
          console.log(formattedMessage);
        }
        break;
      case LogLevel.WARN:
        if (data !== undefined) {
          console.warn(formattedMessage, data);
        } else {
          console.warn(formattedMessage);
        }
        break;
      case LogLevel.ERROR:
        if (data !== undefined) {
          console.error(formattedMessage, data);
        } else {
          console.error(formattedMessage);
        }
        break;
    }
  }
}
