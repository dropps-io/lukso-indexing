import { NestFactory } from '@nestjs/core';

import { IndexerModule } from './indexer.module';
import { DROP_DB_ON_START } from './globals';
import { seedLuksoData } from '../../../scripts/database/lukso-data/seed';
import { seedLuksoStructure } from '../../../scripts/database/lukso-structure/seed';
import { populateLuksoStructure } from '../../../scripts/database/lukso-structure/populate';

async function bootstrap() {
  await seedLuksoData(DROP_DB_ON_START);
  await seedLuksoStructure(DROP_DB_ON_START);
  await populateLuksoStructure();
  const app = await NestFactory.create(IndexerModule);
  await app.listen(3000);
}
bootstrap();
