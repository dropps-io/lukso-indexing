import { Module } from '@nestjs/common';

import { ERC725ySchemasController } from './ERC725y-schemas.controller';
import { ERC725ySchemasService } from './ERC725y-schemas.service';

@Module({
  imports: [],
  controllers: [ERC725ySchemasController],
  providers: [ERC725ySchemasService],
})
export class ERC725ySchemasModule {}
