import { StandardSchemaValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new StandardSchemaValidationPipe({ transform: true }));
  app.enableShutdownHooks();

  // Bound to loopback by default: this API runs network scans and has no authentication.
  const host = process.env.HOST ?? '127.0.0.1';
  const port = Number(process.env.PORT ?? 3100);
  await app.listen(port, host);
}
await bootstrap();
