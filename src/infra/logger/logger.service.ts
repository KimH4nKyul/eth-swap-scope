import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class LoggerService {
  private readonly logger = new Logger('SwapScope');

  log(message: string, context?: string) {
    this.logger.log(message, context);
  }

  warn(message: string, context?: string) {
    this.logger.warn(message, context);
  }

  error(message: string, trace?: Error, context?: string) {
    if (trace) {
      this.logger.error(message, trace.stack, context);
      return;
    }

    this.logger.error(message, undefined, context);
  }

  debug(message: string, context?: string) {
    this.logger.debug(message, context);
  }
}
