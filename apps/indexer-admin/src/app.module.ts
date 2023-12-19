import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';

import { AbiModule } from './abi/abi.module';
import { ContractInterfacesModule } from './contractInterfaces/contractInterfaces.module';
import { ERC725ySchemasModule } from './ERC725ySchemas/ERC725ySchemas.module';
import { AuthModule } from './auth/auth.module';
import { GoogleAuthMiddleware } from './auth/utils/google-auth-middleware';
import { IndexerToolsModule } from './indexerTools/indexerTools.module';

@Module({
  imports: [
    AbiModule,
    ContractInterfacesModule,
    ERC725ySchemasModule,
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
