import { Args, ObjectType, Query, Resolver } from '@nestjs/graphql';

import { ContractTokenService } from './contract-token.service';
import { AddressEntity } from '../address/entities/address.entity';
import { Pagination } from '../entities/pagination.entity';
import { CollectionTokenEntity } from './entities/collection-token.entity';
import { FindCollectionTokenArgs } from './dto/find-collection-token.args';

@ObjectType()
class CollectionTokensPagination extends Pagination(CollectionTokenEntity) {}

@Resolver(() => AddressEntity)
export class ContractTokenResolver {
  constructor(private assetsService: ContractTokenService) {}

  @Query(() => CollectionTokensPagination)
  async collectionTokens(
    @Args() args: FindCollectionTokenArgs,
  ): Promise<CollectionTokensPagination> {
    return this.assetsService.find(args);
  }
}
