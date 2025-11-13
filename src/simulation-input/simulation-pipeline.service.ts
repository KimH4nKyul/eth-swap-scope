import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { TransactionResponse } from 'ethers';
import { from, of, Subscription } from 'rxjs';
import { catchError, filter, map, mergeMap } from 'rxjs/operators';
import { ConfigService } from '../config/config.service';
import { SwapSimulationInput } from '../domain/models/swap-simulation-input.model';
import { SwapIntent } from '../domain/models/swap-intent.model';
import { LoggerService } from '../infra/logger/logger.service';
import { MempoolService } from '../mempool/mempool.service';
import { UniswapV2Builder } from '../uniswap-v2/uniswap-v2.builder';
import { SimulationEventsService } from './simulation-events.service';
import { SimulationFileWriterService } from './simulation-file-writer.service';
import { SimulationInputService } from './simulation-input.service';
import { SimulationStoreService } from './simulation-store.service';

type IntentWithTx = {
  intent: SwapIntent;
  tx: TransactionResponse;
};

@Injectable()
export class SimulationPipelineService
  implements OnModuleInit, OnModuleDestroy
{
  private subscription?: Subscription;

  constructor(
    private readonly mempoolService: MempoolService,
    private readonly builder: UniswapV2Builder,
    private readonly simulationInputService: SimulationInputService,
    private readonly store: SimulationStoreService,
    private readonly fileWriter: SimulationFileWriterService,
    private readonly events: SimulationEventsService,
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {}

  onModuleInit() {
    const concurrency = this.configService.pipelineConcurrency;
    this.subscription = this.mempoolService.pendingTransactions$
      .pipe(
        mergeMap(
          (tx) =>
            from(this.builder.buildFromTx(tx)).pipe(
              map((intent) => (intent ? { intent, tx } : null)),
              catchError((error) => {
                this.logger.error(
                  'Failed to build SwapIntent',
                  error instanceof Error ? error : undefined,
                  'SimulationPipelineService',
                );
                return of(null);
              }),
            ),
          concurrency,
        ),
        filter((value): value is IntentWithTx => value !== null),
        mergeMap(
          (entry) =>
            from(
              this.simulationInputService.buildSimulationInput(
                entry.intent,
                entry.tx,
              ),
            ).pipe(
              catchError((error) => {
                this.logger.error(
                  'Failed to build SimulationInput',
                  error instanceof Error ? error : undefined,
                  'SimulationPipelineService',
                );
                return of(null);
              }),
            ),
          concurrency,
        ),
        filter(
          (value): value is SwapSimulationInput =>
            value !== null && value !== undefined,
        ),
      )
      .subscribe((simulation) => {
        void this.persistSimulation(simulation);
      });
  }

  onModuleDestroy() {
    this.subscription?.unsubscribe();
    this.subscription = undefined;
  }

  private async persistSimulation(simulation: SwapSimulationInput) {
    this.store.add(simulation);
    this.events.emit(simulation);
    this.logger.log(
      `swap intent ${simulation.intent.txHash} (${simulation.intent.fromToken} -> ${simulation.intent.toToken})`,
      'SimulationPipelineService',
    );

    await this.fileWriter.append(simulation);
  }
}
