import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Subject } from 'rxjs';
import { SwapSimulationInput } from '../domain/models/swap-simulation-input.model';

@Injectable()
export class SimulationEventsService implements OnModuleDestroy {
  private readonly subject = new Subject<SwapSimulationInput>();
  readonly stream$ = this.subject.asObservable();

  emit(entry: SwapSimulationInput) {
    this.subject.next(entry);
  }

  onModuleDestroy() {
    this.subject.complete();
  }
}
