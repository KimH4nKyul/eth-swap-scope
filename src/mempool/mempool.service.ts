import { Subject } from 'rxjs';
import { TransactionResponse, WebSocketProvider } from 'ethers';
import { EthersService } from '../infra/ethers/ethers.service';
import { LoggerService } from '../infra/logger/logger.service';

export class MempoolService {
  private readonly pendingSubject = new Subject<TransactionResponse>();
  readonly pendingTransactions$ = this.pendingSubject.asObservable();

  private provider?: WebSocketProvider;
  private handler?: (txHash: string) => void;

  constructor(
    private readonly ethersService: EthersService,
    private readonly logger: LoggerService,
  ) {}

  start() {
    this.provider = this.ethersService.getProvider();
    this.handler = (txHash: string) => {
      void this.handleTxHash(txHash);
    };
    void this.provider.on('pending', this.handler);
    this.logger.log('Subscribed to pending transactions', 'MempoolService');
  }

  private async handleTxHash(txHash: string) {
    if (!this.provider || !txHash) {
      return;
    }

    try {
      const tx = await this.provider.getTransaction(txHash);
      if (tx) {
        this.pendingSubject.next(tx);
      }
    } catch (error) {
      this.logger.error(
        `Failed to fetch tx ${txHash}`,
        error instanceof Error ? error : undefined,
        'MempoolService',
      );
    }
  }

  stop() {
    if (this.provider && this.handler) {
      void this.provider.off('pending', this.handler);
    }

    this.pendingSubject.complete();
  }
}
