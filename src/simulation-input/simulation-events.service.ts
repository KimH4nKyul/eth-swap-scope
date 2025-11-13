import { Subject } from 'rxjs';
import { SwapSimulationInput } from '../domain/models/swap-simulation-input.model';

export class SimulationEventsService {
  private readonly subject = new Subject<SwapSimulationInput>();
  readonly stream$ = this.subject.asObservable();

  emit(entry: SwapSimulationInput) {
    this.subject.next(entry);
  }

  close() {
    this.subject.complete();
  }
}
