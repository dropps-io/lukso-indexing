import { NestFactory } from '@nestjs/core';

import { IndexingModule } from './indexing.module';
import { PORT } from './globals';
import { seedLuksoData } from '../../../scripts/database/lukso-data/seed';
import { seedLuksoStructure } from '../../../scripts/database/lukso-structure/seed';
import { populateLuksoStructure } from '../../../scripts/database/lukso-structure/populate';

async function bootstrap() {
  await seedLuksoData();
  await seedLuksoStructure();
  await populateLuksoStructure();
  const app = await NestFactory.create(IndexingModule);
  await app.listen(PORT);
}
bootstrap();
