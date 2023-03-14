import { NestFactory } from '@nestjs/core';
import { IndexingModule } from './indexing.module';

async function bootstrap() {
  await NestFactory.createApplicationContext(IndexingModule);
}
bootstrap();
