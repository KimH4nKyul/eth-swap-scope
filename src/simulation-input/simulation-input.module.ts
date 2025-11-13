import { Module } from '@nestjs/common';
import { ConfigModule } from '../config/config.module';
import { LoggerModule } from '../infra/logger/logger.module';
import { MempoolModule } from '../mempool/mempool.module';
import { UniswapV2Module } from '../uniswap-v2/uniswap-v2.module';
import { SimulationEventsService } from './simulation-events.service';
import { SimulationFileWriterService } from './simulation-file-writer.service';
import { SimulationInputService } from './simulation-input.service';
import { SimulationPipelineService } from './simulation-pipeline.service';
import { SimulationStoreService } from './simulation-store.service';

@Module({
  imports: [ConfigModule, LoggerModule, MempoolModule, UniswapV2Module],
  providers: [
    SimulationInputService,
    SimulationStoreService,
    SimulationFileWriterService,
    SimulationEventsService,
    SimulationPipelineService,
  ],
  exports: [SimulationStoreService, SimulationEventsService],
})
export class SimulationInputModule {}
