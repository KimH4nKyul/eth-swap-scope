import { Injectable } from '@nestjs/common';
import { TransactionDescription, TransactionResponse } from 'ethers';
import { ConfigService } from '../config/config.service';
import { LoggerService } from '../infra/logger/logger.service';
import { SwapIntent } from '../domain/models/swap-intent.model';
import { UniswapV2DecoderService } from './uniswap-v2-decoder.service';
import {
  SwapClassification,
  UniswapV2ClassifierService,
} from './uniswap-v2-classifier.service';
import { UniswapV2PoolDirectoryService } from './uniswap-v2-pool-directory.service';

type IntentContext = {
  decoded: TransactionDescription;
  classification: SwapClassification;
};

@Injectable()
export class UniswapV2Builder {
  constructor(
    private readonly configService: ConfigService,
    private readonly decoder: UniswapV2DecoderService,
    private readonly classifier: UniswapV2ClassifierService,
    private readonly poolDirectory: UniswapV2PoolDirectoryService,
    private readonly logger: LoggerService,
  ) {}

  async buildFromTx(
    transaction: TransactionResponse,
  ): Promise<SwapIntent | null> {
    const routerAddress = this.configService.uniswapRouterAddress;
    if (!routerAddress) {
      this.logger.warn(
        'Router address is not configured, skip mempool decoding',
        'UniswapV2Builder',
      );
      return null;
    }

    const txTo = transaction.to?.toLowerCase();
    if (!txTo || txTo !== routerAddress) {
      return null;
    }

    const context = this.decodeTransaction(transaction);
    if (!context) {
      return null;
    }

    const [fromToken, nextToken] = context.classification.path;
    const poolAddress = await this.poolDirectory.getPairAddress(
      fromToken,
      nextToken,
    );
    if (!poolAddress) {
      return null;
    }

    return {
      txHash: transaction.hash ?? '',
      fromAddress: transaction.from?.toLowerCase() ?? '',
      routerAddress,
      poolAddress,
      fromToken,
      toToken:
        context.classification.path[
          context.classification.path.length - 1
        ] ?? '',
      amountIn: context.classification.amountIn,
      amountOutMin: context.classification.amountOutMin,
      path: context.classification.path,
      deadline: context.classification.deadline,
      createdAt: Date.now(),
    };
  }

  private decodeTransaction(
    transaction: TransactionResponse,
  ): IntentContext | null {
    const decoded = this.decoder.decode(transaction.data);
    if (!decoded) {
      return null;
    }

    const classification = this.classifier.classifySwap(decoded, transaction);
    if (!classification) {
      return null;
    }

    return { decoded, classification };
  }
}
