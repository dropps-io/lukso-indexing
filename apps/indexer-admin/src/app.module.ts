import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';

import { AbiModule } from './abi/abi.module';
import { ContractInterfacesModule } from './contract-interfaces/contract-interfaces.module';
import { Erc725ySchemasModule } from './erc725y-schemas/erc725y-schemas.module';
import { AuthModule } from './auth/auth.module';
import { GoogleAuthMiddleware } from './auth/utils/google-auth-middleware';
import { IndexerToolsModule } from './indexer-tools/indexer-tools.module';

@Module({
  imports: [
    AbiModule,
    ContractInterfacesModule,
    Erc725ySchemasModule,
    AuthModule,
    IndexerToolsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(GoogleAuthMiddleware).forRoutes('abi', 'erc725ySchemas', 'contractInterfaces');
  }
}
