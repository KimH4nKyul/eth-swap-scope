export type SwapIntent = {
  txHash: string;
  fromAddress: string;
  routerAddress: string;
  poolAddress: string;
  fromToken: string;
  toToken: string;
  amountIn: bigint;
  amountOutMin: bigint;
  path: string[];
  deadline?: number;
  createdAt: number;
};
