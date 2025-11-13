import { Module } from '@nestjs/common';
import { ConfigModule } from '../../config/config.module';
import { LoggerModule } from '../logger/logger.module';
import { EthersService } from './ethers.service';

@Module({
  imports: [ConfigModule, LoggerModule],
  providers: [EthersService],
  exports: [EthersService],
})
export class EthersModule {}
