import { SwapIntent } from './swap-intent.model';

export type PairState = {
  address: string;
  token0: string;
  token1: string;
  reserve0: bigint;
  reserve1: bigint;
  blockTimestampLast?: number;
};

export type SwapSimulationInput = {
  intent: SwapIntent;
  pair: PairState;
  normalized: {
    reserveIn: bigint;
    reserveOut: bigint;
  };
  fee: {
    rate: number;
  };
  meta: {
    gasPrice: bigint;
    value: bigint;
    blockNumber?: number;
  };
};
