import { Module } from '@nestjs/common';
import { FEATURE_MODULES } from './features/index.js';

@Module({
  imports: [...FEATURE_MODULES],
})
export class AppModule {}
