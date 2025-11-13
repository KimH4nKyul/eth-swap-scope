import { ApiServer } from './api/server';
import { ConfigService } from './config/config.service';
import { LoggerService } from './infra/logger/logger.service';
import { EthersService } from './infra/ethers/ethers.service';
import { MempoolService } from './mempool/mempool.service';
import { SimulationEventsService } from './simulation-input/simulation-events.service';
import { SimulationFileWriterService } from './simulation-input/simulation-file-writer.service';
import { SimulationInputService } from './simulation-input/simulation-input.service';
import { SimulationPipelineService } from './simulation-input/simulation-pipeline.service';
import { SimulationStoreService } from './simulation-input/simulation-store.service';
import { UniswapV2Builder } from './uniswap-v2/uniswap-v2.builder';
import { UniswapV2ClassifierService } from './uniswap-v2/uniswap-v2-classifier.service';
import { UniswapV2DecoderService } from './uniswap-v2/uniswap-v2-decoder.service';
import { UniswapV2PoolDirectoryService } from './uniswap-v2/uniswap-v2-pool-directory.service';
import { UniswapV2PoolStateService } from './uniswap-v2/uniswap-v2-pool-state.service';

async function bootstrap() {
  const config = new ConfigService();
  const logger = new LoggerService();

  const ethersService = new EthersService(config, logger);
  const mempoolService = new MempoolService(ethersService, logger);
  const decoder = new UniswapV2DecoderService();
  const classifier = new UniswapV2ClassifierService();
  const poolDirectory = new UniswapV2PoolDirectoryService(
    config,
    ethersService,
    logger,
  );
  const poolState = new UniswapV2PoolStateService(ethersService, logger);
  const builder = new UniswapV2Builder(
    config,
    decoder,
    classifier,
    poolDirectory,
    logger,
  );

  const simulationInputService = new SimulationInputService(
    poolState,
    config,
    logger,
  );
  const store = new SimulationStoreService(config);
  const fileWriter = new SimulationFileWriterService(config, logger);
  await fileWriter.initialize();

  const events = new SimulationEventsService();
  const pipeline = new SimulationPipelineService(
    mempoolService,
    builder,
    simulationInputService,
    store,
    fileWriter,
    events,
    config,
    logger,
  );

  const apiServer = new ApiServer(store, events, logger);

  const port = Number(process.env.PORT ?? 3000);

  mempoolService.start();
  pipeline.start();
  await apiServer.start(port);

  let shuttingDown = false;
  const gracefulShutdown = async (exitCode = 0) => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    logger.log('Shutting down...', 'Bootstrap');
    try {
      await apiServer.stop();
      pipeline.stop();
      mempoolService.stop();
      events.close();
      await ethersService.destroy();
      logger.log('Shutdown complete', 'Bootstrap');
      process.exit(exitCode);
    } catch (error) {
      logger.error(
        'Error during shutdown',
        error instanceof Error ? error : undefined,
        'Bootstrap',
      );
      process.exit(1);
    }
  };

  ['SIGINT', 'SIGTERM'].forEach((signal) => {
    process.on(signal, () => {
      void gracefulShutdown();
    });
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', error, 'Bootstrap');
    void gracefulShutdown(1);
  });

  process.on('unhandledRejection', (reason) => {
    logger.error(
      `Unhandled rejection: ${JSON.stringify(reason)}`,
      reason instanceof Error ? reason : undefined,
      'Bootstrap',
    );
    void gracefulShutdown(1);
  });
}

void bootstrap().catch((error) => {
  const logger = new LoggerService();
  logger.error(
    'Bootstrap failed',
    error instanceof Error ? error : undefined,
    'Bootstrap',
  );
  process.exit(1);
});
