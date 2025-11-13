import { TransactionDescription, TransactionResponse } from 'ethers';

export type SupportedSwapMethod =
  | 'swapExactTokensForTokens'
  | 'swapTokensForExactTokens'
  | 'swapExactETHForTokens'
  | 'swapExactTokensForETH';

export type SwapClassification = {
  method: SupportedSwapMethod;
  path: string[];
  amountIn: bigint;
  amountOutMin: bigint;
  deadline?: number;
};

const bigintify = (value: unknown): bigint => {
  if (typeof value === 'bigint') {
    return value;
  }

  if (typeof value === 'number') {
    return BigInt(value);
  }

  if (typeof value === 'string') {
    return BigInt(value);
  }

  if (
    value &&
    typeof (value as { toString: () => string }).toString === 'function'
  ) {
    return BigInt((value as { toString: () => string }).toString());
  }

  return 0n;
};

const normalizePath = (rawPath: unknown): string[] => {
  if (!Array.isArray(rawPath)) {
    return [];
  }

  return rawPath
    .map((address) =>
      typeof address === 'string' ? address.toLowerCase() : String(address),
    )
    .filter(Boolean);
};

export class UniswapV2ClassifierService {
  private readonly supported = new Set<SupportedSwapMethod>([
    'swapExactTokensForTokens',
    'swapTokensForExactTokens',
    'swapExactETHForTokens',
    'swapExactTokensForETH',
  ]);

  classifySwap(
    decoded: TransactionDescription,
    tx: TransactionResponse,
  ): SwapClassification | null {
    if (!this.supported.has(decoded.name as SupportedSwapMethod)) {
      return null;
    }

    const path = normalizePath(decoded.args.path ?? decoded.args[2] ?? []);
    if (path.length < 2) {
      return null;
    }

    switch (decoded.name as SupportedSwapMethod) {
      case 'swapExactTokensForTokens':
        return {
          method: decoded.name as SupportedSwapMethod,
          path,
          amountIn: bigintify(decoded.args.amountIn ?? decoded.args[0]),
          amountOutMin: bigintify(decoded.args.amountOutMin ?? decoded.args[1]),
          deadline: decoded.args.deadline
            ? Number(decoded.args.deadline)
            : undefined,
        };
      case 'swapTokensForExactTokens':
        return {
          method: decoded.name as SupportedSwapMethod,
          path,
          amountIn: bigintify(decoded.args.amountInMax ?? decoded.args[1]),
          amountOutMin: bigintify(decoded.args.amountOut ?? decoded.args[0]),
          deadline: decoded.args.deadline
            ? Number(decoded.args.deadline)
            : undefined,
        };
      case 'swapExactETHForTokens':
        return {
          method: decoded.name as SupportedSwapMethod,
          path,
          amountIn: tx.value ?? 0n,
          amountOutMin: bigintify(decoded.args.amountOutMin ?? decoded.args[0]),
          deadline: decoded.args.deadline
            ? Number(decoded.args.deadline)
            : undefined,
        };
      case 'swapExactTokensForETH':
        return {
          method: decoded.name as SupportedSwapMethod,
          path,
          amountIn: bigintify(decoded.args.amountIn ?? decoded.args[0]),
          amountOutMin: bigintify(decoded.args.amountOutMin ?? decoded.args[1]),
          deadline: decoded.args.deadline
            ? Number(decoded.args.deadline)
            : undefined,
        };
      default:
        return null;
    }
  }
}
