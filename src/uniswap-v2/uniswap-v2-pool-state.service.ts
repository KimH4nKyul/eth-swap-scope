import { Injectable } from '@nestjs/common';
import { Interface, InterfaceAbi } from 'ethers';
import { EthersService } from '../infra/ethers/ethers.service';
import { LoggerService } from '../infra/logger/logger.service';
import { PairState } from '../domain/models/swap-simulation-input.model';

const PAIR_ABI: InterfaceAbi = [
  'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
  'function token0() external view returns (address)',
  'function token1() external view returns (address)',
];

type TokenMetadata = {
  token0: string;
  token1: string;
};

@Injectable()
export class UniswapV2PoolStateService {
  private readonly iface = new Interface(PAIR_ABI);
  private readonly tokenCache = new Map<string, TokenMetadata>();

  constructor(
    private readonly ethersService: EthersService,
    private readonly logger: LoggerService,
  ) {}

  async getPoolState(pairAddress: string): Promise<PairState | null> {
    if (!pairAddress) {
      return null;
    }

    try {
      const provider = this.ethersService.getProvider();
      const reserveData = this.iface.encodeFunctionData('getReserves', []);
      const rawReserves = await provider.call({
        to: pairAddress,
        data: reserveData,
      });

      const [reserve0Raw, reserve1Raw, blockTimestampLastRaw] =
        this.iface.decodeFunctionResult(
          'getReserves',
          rawReserves,
        ) as unknown as [bigint, bigint, bigint];

      const tokens = await this.resolveTokens(pairAddress);
      if (!tokens) {
        return null;
      }

      return {
        address: pairAddress,
        token0: tokens.token0,
        token1: tokens.token1,
        reserve0: BigInt(reserve0Raw),
        reserve1: BigInt(reserve1Raw),
        blockTimestampLast: Number(blockTimestampLastRaw),
      };
    } catch (error) {
      this.logger.error(
        `Failed to load reserves for ${pairAddress}`,
        error instanceof Error ? error : undefined,
        'UniswapV2PoolStateService',
      );
      return null;
    }
  }

  private async resolveTokens(
    pairAddress: string,
  ): Promise<TokenMetadata | null> {
    if (this.tokenCache.has(pairAddress)) {
      return this.tokenCache.get(pairAddress) ?? null;
    }

    try {
      const provider = this.ethersService.getProvider();
      const token0Data = this.iface.encodeFunctionData('token0', []);
      const token1Data = this.iface.encodeFunctionData('token1', []);
      const [rawToken0, rawToken1] = await Promise.all([
        provider.call({ to: pairAddress, data: token0Data }),
        provider.call({ to: pairAddress, data: token1Data }),
      ]);

      const [token0Raw] = this.iface.decodeFunctionResult(
        'token0',
        rawToken0,
      ) as unknown as [string];
      const [token1Raw] = this.iface.decodeFunctionResult(
        'token1',
        rawToken1,
      ) as unknown as [string];

      const metadata = {
        token0: token0Raw.toLowerCase(),
        token1: token1Raw.toLowerCase(),
      };

      this.tokenCache.set(pairAddress, metadata);
      return metadata;
    } catch (error) {
      this.logger.error(
        `Failed to resolve pair tokens for ${pairAddress}`,
        error instanceof Error ? error : undefined,
        'UniswapV2PoolStateService',
      );
      return null;
    }
  }
}
