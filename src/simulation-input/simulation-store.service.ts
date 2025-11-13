import { ConfigService } from '../config/config.service';
import { SwapSimulationInput } from '../domain/models/swap-simulation-input.model';

export class SimulationStoreService {
  private readonly items: SwapSimulationInput[] = [];

  constructor(private readonly configService: ConfigService) {}

  add(entry: SwapSimulationInput) {
    this.items.unshift(entry);
    const limit = this.configService.maxRecentSimulations;
    if (this.items.length > limit) {
      this.items.length = limit;
    }
  }

  getRecent(limit?: number): SwapSimulationInput[] {
    if (!limit || limit <= 0) {
      return [...this.items];
    }

    return this.items.slice(0, limit);
  }
}
