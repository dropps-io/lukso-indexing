import { Resolver, Query, Args, ResolveField, Parent } from '@nestjs/graphql';

import { AddressService } from './address.service';
import { AddressEntity } from './entities/address.entity';
import { MetadataImage } from './entities/metadata.entity';

@Resolver(() => AddressEntity)
export class AddressResolver {
  constructor(private addressService: AddressService) {}

  @Query(() => AddressEntity, { nullable: true })
  async address(@Args('address') address: string): Promise<AddressEntity | null> {
    return this.addressService.findByAddress(address);
  }

  @ResolveField(() => [MetadataImage], { nullable: 'items' })
  async images(
    @Parent() address: AddressEntity,
    @Args('type', { nullable: true, type: () => String }) type?: string | null,
  ): Promise<MetadataImage[] | null> {
    return this.addressService.findImages(address.id, type);
  }
}
