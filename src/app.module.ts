import { Module } from '@nestjs/common';
import { ApiModule } from './api/api.module';
import { ConfigModule } from './config/config.module';
import { EthersModule } from './infra/ethers/ethers.module';
import { LoggerModule } from './infra/logger/logger.module';
import { MempoolModule } from './mempool/mempool.module';
import { SimulationInputModule } from './simulation-input/simulation-input.module';
import { UniswapV2Module } from './uniswap-v2/uniswap-v2.module';

@Module({
  imports: [
    ConfigModule,
    LoggerModule,
    EthersModule,
    MempoolModule,
    UniswapV2Module,
    SimulationInputModule,
    ApiModule,
  ],
})
export class AppModule {}
