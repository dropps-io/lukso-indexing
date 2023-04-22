import { Injectable } from '@nestjs/common';
import winston from 'winston';
import { LoggerService } from '@libs/logger/logger.service';
import { LuksoStructureDbService } from '@db/lukso-structure/lukso-structure-db.service';

import { MethodEntity } from './entities/method.entity';
import { MethodParameterEntity } from './entities/method-parameter.entity';

@Injectable()
export class MethodService {
  private readonly fileLogger: winston.Logger;

  constructor(
    private readonly structureDB: LuksoStructureDbService,
    private readonly logger: LoggerService,
  ) {
    this.fileLogger = logger.getChildLogger('Method');
  }
  async findById(id: string): Promise<MethodEntity | null> {
    return await this.structureDB.getMethodInterfaceById(id);
  }

  async findParametersById(id: string): Promise<MethodParameterEntity[]> {
    return await this.structureDB.getMethodParametersByMethodId(id);
  }
}
