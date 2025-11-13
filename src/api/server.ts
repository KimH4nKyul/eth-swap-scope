import cors from 'cors';
import express from 'express';
import { createServer, Server as HttpServer } from 'node:http';
import { AddressInfo } from 'node:net';
import { Subscription } from 'rxjs';
import { Server as SocketServer } from 'socket.io';
import { LoggerService } from '../infra/logger/logger.service';
import { SimulationEventsService } from '../simulation-input/simulation-events.service';
import { SimulationStoreService } from '../simulation-input/simulation-store.service';

export class ApiServer {
  private readonly app = express();
  private httpServer?: HttpServer;
  private io?: SocketServer;
  private subscription?: Subscription;

  constructor(
    private readonly store: SimulationStoreService,
    private readonly events: SimulationEventsService,
    private readonly logger: LoggerService,
  ) {
    this.app.use(cors());
    this.registerRoutes();
  }

  private registerRoutes() {
    this.app.get('/health', (_req, res) => {
      res.json({ status: 'ok', timestamp: Date.now() });
    });

    this.app.get('/simulation-inputs/recent', (req, res) => {
      const limitParam = req.query.limit;
      const parsed =
        typeof limitParam === 'string' ? Number(limitParam) : undefined;
      const limit =
        parsed && Number.isFinite(parsed) && parsed > 0
          ? Math.floor(parsed)
          : undefined;
      res.json(this.store.getRecent(limit));
    });
  }

  async start(port: number) {
    this.httpServer = createServer(this.app);
    this.io = new SocketServer(this.httpServer, {
      cors: {
        origin: '*',
      },
    });

    this.subscription = this.events.stream$.subscribe((simulation) => {
      this.io?.emit('simulation', simulation);
    });

    await new Promise<void>((resolve) => {
      this.httpServer?.listen(port, () => resolve());
    });

    const address = this.httpServer.address() as AddressInfo;
    this.logger.log(
      `HTTP/WebSocket server listening on port ${address.port}`,
      'ApiServer',
    );
  }

  async stop() {
    this.subscription?.unsubscribe();
    this.subscription = undefined;

    if (this.io) {
      await this.io.close();
      this.io = undefined;
    }

    if (this.httpServer) {
      await new Promise<void>((resolve) =>
        this.httpServer?.close(() => resolve()),
      );
      this.httpServer = undefined;
    }
  }
}
