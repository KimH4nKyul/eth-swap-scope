type LogLevel = 'log' | 'warn' | 'error' | 'debug';

const format = (level: LogLevel, message: string, context?: string) => {
  const timestamp = new Date().toISOString();
  const tag = context ? `[${context}]` : '';
  return `${timestamp} ${level.toUpperCase()} ${tag} ${message}`.trim();
};

export class LoggerService {
  log(message: string, context?: string) {
    console.log(format('log', message, context));
  }

  warn(message: string, context?: string) {
    console.warn(format('warn', message, context));
  }

  error(message: string, error?: Error, context?: string) {
    const base = format('error', message, context);
    if (error) {
      console.error(`${base}\n${error.stack ?? error.message}`);
      return;
    }

    console.error(base);
  }

  debug(message: string, context?: string) {
    if (process.env.DEBUG !== 'true') {
      return;
    }

    console.debug(format('debug', message, context));
  }
}
