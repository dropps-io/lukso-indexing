import { Resolver, Query, Args, ResolveField, Parent, ObjectType } from '@nestjs/graphql';

import { AddressService } from './address.service';
import { AddressEntity } from './entities/address.entity';
import { MetadataImageEntity } from './entities/metadata.entity';
import { FindAddressArgs } from './dto/find-address.args';
import { Pagination } from '../utils/pagination-entity';

@ObjectType()
class AddressPagination extends Pagination(AddressEntity) {}

@Resolver(() => AddressEntity)
export class AddressResolver {
  constructor(private addressService: AddressService) {}

  @Query(() => AddressPagination)
  async address(@Args() args: FindAddressArgs): Promise<AddressPagination> {
    return this.addressService.find(args);
  }

  @ResolveField(() => [MetadataImageEntity], { nullable: 'items' })
  async images(
    @Parent() address: AddressEntity,
    @Args('type', { nullable: true, type: () => String }) type?: string | null,
  ): Promise<MetadataImageEntity[] | null> {
    return this.addressService.findImages(address.id, type);
  }
}
