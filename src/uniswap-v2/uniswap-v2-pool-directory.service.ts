import { Injectable } from '@nestjs/common';
import { Interface, InterfaceAbi, ZeroAddress } from 'ethers';
import { ConfigService } from '../config/config.service';
import { EthersService } from '../infra/ethers/ethers.service';
import { LoggerService } from '../infra/logger/logger.service';

const FACTORY_ABI: InterfaceAbi = [
  'function getPair(address tokenA, address tokenB) external view returns (address)',
];

const sortTokens = (tokenA: string, tokenB: string): [string, string] => {
  return tokenA.toLowerCase() < tokenB.toLowerCase()
    ? [tokenA.toLowerCase(), tokenB.toLowerCase()]
    : [tokenB.toLowerCase(), tokenA.toLowerCase()];
};

@Injectable()
export class UniswapV2PoolDirectoryService {
  private readonly iface = new Interface(FACTORY_ABI);
  private readonly cache = new Map<string, string | null>();

  constructor(
    private readonly config: ConfigService,
    private readonly ethersService: EthersService,
    private readonly logger: LoggerService,
  ) {}

  async getPairAddress(tokenA: string, tokenB: string): Promise<string | null> {
    const factoryAddress = this.config.uniswapFactoryAddress;
    if (!factoryAddress) {
      this.logger.warn(
        'Uniswap factory address is not configured',
        'UniswapV2PoolDirectoryService',
      );
      return null;
    }

    const [token0, token1] = sortTokens(tokenA, tokenB);
    const cacheKey = `${token0}:${token1}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey) ?? null;
    }

    try {
      const provider = this.ethersService.getProvider();
      const data = this.iface.encodeFunctionData('getPair', [token0, token1]);
      const raw = await provider.call({
        to: factoryAddress,
        data,
      });
      const [pairAddressRaw] = this.iface.decodeFunctionResult(
        'getPair',
        raw,
      ) as unknown as [string];
      const normalized =
        pairAddressRaw && pairAddressRaw !== ZeroAddress
          ? pairAddressRaw.toLowerCase()
          : null;

      this.cache.set(cacheKey, normalized);
      return normalized;
    } catch (error) {
      this.logger.error(
        `Failed to fetch pair for ${tokenA}/${tokenB}`,
        error instanceof Error ? error : undefined,
        'UniswapV2PoolDirectoryService',
      );
      return null;
    }
  }
}
