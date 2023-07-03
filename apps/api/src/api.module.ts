import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';

import { AddressModule } from './address/address.module';
import { MethodModule } from './method/method.module';
import { WrappedTxModule } from './wrapped-tx/wrapped-tx.module';
import { CollectionTokenModule } from './collection-token/collection-token.module';
import { TokenHolderModule } from './token-holder/token-holder.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    AddressModule,
    MethodModule,
    WrappedTxModule,
    CollectionTokenModule,
    TokenHolderModule,
    GraphQLModule.forRoot<ApolloDriverConfig>({
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      driver: ApolloDriver,
      playground: process.env.NODE_ENV !== 'production',
      introspection: process.env.NODE_ENV !== 'production',
    }),
  ],
  controllers: [HealthController],
  providers: [],
})
export class ApiModule {}
