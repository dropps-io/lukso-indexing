import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';

import { AddressModule } from './address/address.module';
import { MethodModule } from './method/method.module';
import { WrappedTxModule } from './wrapped-tx/wrapped-tx.module';

@Module({
  imports: [
    AddressModule,
    MethodModule,
    WrappedTxModule,
    GraphQLModule.forRoot<ApolloDriverConfig>({
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      driver: ApolloDriver,
      playground: process.env.NODE_ENV !== 'production',
      introspection: process.env.NODE_ENV !== 'production',
    }),
  ],
  providers: [],
})
export class ApiModule {}
