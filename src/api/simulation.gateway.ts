import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Subscription } from 'rxjs';
import { Server } from 'socket.io';
import { SimulationEventsService } from '../simulation-input/simulation-events.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class SimulationGateway implements OnModuleInit, OnModuleDestroy {
  @WebSocketServer()
  server?: Server;

  private subscription?: Subscription;

  constructor(private readonly events: SimulationEventsService) {}

  onModuleInit() {
    this.subscription = this.events.stream$.subscribe((simulation) => {
      this.server?.emit('simulation', simulation);
    });
  }

  onModuleDestroy() {
    this.subscription?.unsubscribe();
    this.subscription = undefined;
  }
}
