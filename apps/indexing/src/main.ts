import { NestFactory } from '@nestjs/core';

import { IndexingModule } from './indexing.module';
import { PORT } from './globals';

async function bootstrap() {
  const app = await NestFactory.create(IndexingModule);
  await app.listen(PORT);
}
bootstrap();
