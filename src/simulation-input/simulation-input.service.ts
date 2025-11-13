import { Injectable } from '@nestjs/common';
import { TransactionResponse } from 'ethers';
import { ConfigService } from '../config/config.service';
import { SwapSimulationInput } from '../domain/models/swap-simulation-input.model';
import { SwapIntent } from '../domain/models/swap-intent.model';
import { LoggerService } from '../infra/logger/logger.service';
import { UniswapV2PoolStateService } from '../uniswap-v2/uniswap-v2-pool-state.service';

const FEE_RATE = 0.003;

@Injectable()
export class SimulationInputService {
  constructor(
    private readonly poolStateService: UniswapV2PoolStateService,
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {}

  async buildSimulationInput(
    intent: SwapIntent,
    tx: TransactionResponse,
  ): Promise<SwapSimulationInput | null> {
    if (!this.matchesWatchList(intent)) {
      return null;
    }

    const pairState = await this.poolStateService.getPoolState(
      intent.poolAddress,
    );
    if (!pairState) {
      return null;
    }

    const normalized = this.normalizeReserves(intent, pairState);
    if (!normalized) {
      this.logger.warn(
        `Unable to normalize reserves for ${intent.poolAddress}`,
        'SimulationInputService',
      );
      return null;
    }

    return {
      intent,
      pair: pairState,
      normalized,
      fee: {
        rate: FEE_RATE,
      },
      meta: {
        gasPrice:
          tx.maxFeePerGas ?? tx.gasPrice ?? tx.maxPriorityFeePerGas ?? 0n,
        value: tx.value ?? 0n,
        blockNumber: tx.blockNumber ?? undefined,
      },
    };
  }

  private matchesWatchList(intent: SwapIntent): boolean {
    const pools = this.configService.watchedPools;
    const tokens = this.configService.watchedTokens;

    if (pools.length === 0 && tokens.length === 0) {
      return true;
    }

    if (pools.includes(intent.poolAddress)) {
      return true;
    }

    if (tokens.includes(intent.fromToken) || tokens.includes(intent.toToken)) {
      return true;
    }

    return false;
  }

  private normalizeReserves(
    intent: SwapIntent,
    pair: {
      token0: string;
      token1: string;
      reserve0: bigint;
      reserve1: bigint;
    },
  ) {
    const fromToken = intent.fromToken;

    if (fromToken === pair.token0) {
      return {
        reserveIn: pair.reserve0,
        reserveOut: pair.reserve1,
      };
    }

    if (fromToken === pair.token1) {
      return {
        reserveIn: pair.reserve1,
        reserveOut: pair.reserve0,
      };
    }

    return null;
  }
}
