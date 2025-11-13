import { WebSocketLike, WebSocketProvider } from 'ethers';
import { ConfigService } from '../../config/config.service';
import { LoggerService } from '../logger/logger.service';

export class EthersService {
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
    const provider = new WebSocketProvider(this.configService.ethWsUrl);

    const ws = provider.websocket as WebSocketLike & {
      onclose?: (event: unknown) => void;
      onerror?: (event: unknown) => void;
    };
    if (ws && 'onclose' in ws) {
      ws.onclose = (event) => {
        this.logger.warn(
          `WebSocket connection closed (${JSON.stringify(event)})`,
          'EthersService',
        );
      };
    }

    if (ws && 'onerror' in ws) {
      ws.onerror = (error) => {
        this.logger.error(
          'WebSocket provider error',
          error instanceof Error ? error : undefined,
          'EthersService',
        );
      };
    }

    return provider;
  }

  async destroy() {
    if (this.provider) {
      await this.provider.destroy();
      this.provider = undefined;
    }
  }
}
