import { Module } from '@nestjs/common';

import { Erc725ySchemasController } from './erc725y-schemas.controller';
import { Erc725ySchemasService } from './erc725y-schemas.service';

@Module({
  imports: [],
  controllers: [Erc725ySchemasController],
  providers: [Erc725ySchemasService],
})
export class Erc725ySchemasModule {}
