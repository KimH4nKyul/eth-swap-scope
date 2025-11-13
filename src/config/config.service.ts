import { Injectable } from '@nestjs/common';
import { resolve } from 'node:path';

const DEFAULT_WS_URL = 'ws://localhost:8546';
const DEFAULT_OUTPUT_FILE = './data/swap-simulations.jsonl';
const DEFAULT_MAX_RECENT = 200;
const DEFAULT_PIPELINE_CONCURRENCY = 4;
const parsePositiveInt = (
  value: string | undefined,
  fallback: number,
): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const toAddress = (value?: string): string | undefined => {
  if (!value) {
    return undefined;
  }

  return value.toLowerCase();
};

const toList = (value?: string): string[] => {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
};

@Injectable()
export class ConfigService {
  readonly ethWsUrl: string;
  readonly uniswapRouterAddress?: string;
  readonly uniswapFactoryAddress?: string;
  readonly watchedPools: string[];
  readonly watchedTokens: string[];
  readonly outputFile: string;
  readonly maxRecentSimulations: number;
  readonly pipelineConcurrency: number;

  constructor() {
    this.ethWsUrl = process.env.ETH_WS_URL ?? DEFAULT_WS_URL;
    this.uniswapRouterAddress = toAddress(process.env.UNISWAP_V2_ROUTER);
    this.uniswapFactoryAddress = toAddress(process.env.UNISWAP_V2_FACTORY);
    this.watchedPools = toList(process.env.WATCHED_POOLS);
    this.watchedTokens = toList(process.env.WATCHED_TOKENS);
    this.outputFile = resolve(
      process.cwd(),
      process.env.SIMULATION_OUTPUT_FILE ?? DEFAULT_OUTPUT_FILE,
    );
    this.maxRecentSimulations = parsePositiveInt(
      process.env.MAX_RECENT_SIMULATIONS,
      DEFAULT_MAX_RECENT,
    );
    this.pipelineConcurrency = parsePositiveInt(
      process.env.PIPELINE_CONCURRENCY,
      DEFAULT_PIPELINE_CONCURRENCY,
    );
  }

  normalizeAddress(value?: string | null): string | undefined {
    if (!value) {
      return undefined;
    }

    return value.toLowerCase();
  }
}
