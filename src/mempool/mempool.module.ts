import { Module } from '@nestjs/common';
import { EthersModule } from '../infra/ethers/ethers.module';
import { LoggerModule } from '../infra/logger/logger.module';
import { MempoolService } from './mempool.service';

@Module({
  imports: [EthersModule, LoggerModule],
  providers: [MempoolService],
  exports: [MempoolService],
})
export class MempoolModule {}
