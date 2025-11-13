import { Module } from '@nestjs/common';
import { SimulationInputModule } from '../simulation-input/simulation-input.module';
import { SimulationController } from './simulation.controller';
import { SimulationGateway } from './simulation.gateway';

@Module({
  imports: [SimulationInputModule],
  controllers: [SimulationController],
  providers: [SimulationGateway],
})
export class ApiModule {}
