import { Injectable, OnModuleInit } from '@nestjs/common';
import { mkdir, appendFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { ConfigService } from '../config/config.service';
import { SwapSimulationInput } from '../domain/models/swap-simulation-input.model';
import { LoggerService } from '../infra/logger/logger.service';

@Injectable()
export class SimulationFileWriterService implements OnModuleInit {
  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {}

  async onModuleInit() {
    const filePath = this.configService.outputFile;
    await mkdir(dirname(filePath), { recursive: true });
  }

  async append(simulation: SwapSimulationInput) {
    const filePath = this.configService.outputFile;
    try {
      await appendFile(filePath, `${JSON.stringify(simulation)}\n`, 'utf8');
    } catch (error) {
      this.logger.error(
        `Failed to append simulation to ${filePath}`,
        error instanceof Error ? error : undefined,
        'SimulationFileWriterService',
      );
    }
  }
}
