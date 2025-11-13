import { Module } from '@nestjs/common';
import { ConfigModule } from '../config/config.module';
import { EthersModule } from '../infra/ethers/ethers.module';
import { LoggerModule } from '../infra/logger/logger.module';
import { UniswapV2Builder } from './uniswap-v2.builder';
import { UniswapV2ClassifierService } from './uniswap-v2-classifier.service';
import { UniswapV2DecoderService } from './uniswap-v2-decoder.service';
import { UniswapV2PoolDirectoryService } from './uniswap-v2-pool-directory.service';
import { UniswapV2PoolStateService } from './uniswap-v2-pool-state.service';

@Module({
  imports: [ConfigModule, EthersModule, LoggerModule],
  providers: [
    UniswapV2DecoderService,
    UniswapV2ClassifierService,
    UniswapV2PoolDirectoryService,
    UniswapV2PoolStateService,
    UniswapV2Builder,
  ],
  exports: [UniswapV2Builder, UniswapV2PoolStateService],
})
export class UniswapV2Module {}
