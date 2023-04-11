import { Resolver, Query, Args } from '@nestjs/graphql';

import { AddressService } from './address.service';
import { AddressEntity } from './entities/address.entity';

@Resolver('Address')
export class AddressResolver {
  constructor(private addressService: AddressService) {}

  @Query(() => AddressEntity, { nullable: true })
  async address(@Args('address') address: string): Promise<AddressEntity | null> {
    return this.addressService.findByAddress(address);
  }
}
