import { Logger, StandardSchemaValidationPipe, type INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { setTimeout as sleep } from 'node:timers/promises';
import { AppModule } from './app.module.js';

/**
 * In containers the API may bind to a bridge gateway address that appears only
 * once the bridge is up, so a missing address is retried for a short while.
 */
async function listen(app: INestApplication, port: number, host: string, attempts = 30) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await app.listen(port, host);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EADDRNOTAVAIL' || attempt >= attempts) throw error;
      Logger.warn(`Address ${host} not available yet, retrying (${attempt}/${attempts})`, 'Bootstrap');
      await sleep(1000);
    }
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new StandardSchemaValidationPipe({ transform: true }));
  app.enableShutdownHooks();

  // Bound to loopback by default: this API runs network scans and has no authentication.
  const host = process.env.HOST ?? '127.0.0.1';
  const port = Number(process.env.PORT ?? 3100);
  await listen(app, port, host);
}
await bootstrap();
