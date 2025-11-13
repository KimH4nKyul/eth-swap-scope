import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { WebSocketProvider } from 'ethers';
import { ConfigService } from '../../config/config.service';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class EthersService implements OnModuleDestroy {
  private provider?: WebSocketProvider;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.provider = this.createProvider();
  }

  getProvider(): WebSocketProvider {
    if (!this.provider) {
      this.provider = this.createProvider();
    }

    return this.provider;
  }

  private createProvider(): WebSocketProvider {
    const provider = new WebSocketProvider(this.configService.ethWsUrl, undefined, {
      retryTimeout: 1_000,
    });

    const ws = provider.websocket as Record<string, unknown>;
    if (ws && 'onclose' in ws) {
      (ws as { onclose?: (event: unknown) => void }).onclose = (event) => {
        this.logger.warn(
          `WebSocket connection closed (${JSON.stringify(event)})`,
          'EthersService',
        );
      };
    }

    if (ws && 'onerror' in ws) {
      (ws as { onerror?: (event: unknown) => void }).onerror = (error) => {
        this.logger.error(
          'WebSocket provider error',
          error instanceof Error ? error : undefined,
          'EthersService',
        );
      };
    }

    return provider;
  }

  async onModuleDestroy() {
    if (this.provider) {
      await this.provider.destroy();
      this.provider = undefined;
    }
  }
}
