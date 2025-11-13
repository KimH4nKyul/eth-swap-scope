import { Controller, Get, Query } from '@nestjs/common';
import { SimulationStoreService } from '../simulation-input/simulation-store.service';

@Controller('simulation-inputs')
export class SimulationController {
  constructor(private readonly store: SimulationStoreService) {}

  @Get('recent')
  getRecent(@Query('limit') limit?: string) {
    const parsed = limit ? Number(limit) : undefined;
    const sanitized =
      parsed && Number.isFinite(parsed) && parsed > 0
        ? Math.floor(parsed)
        : undefined;
    return this.store.getRecent(sanitized);
  }
}
