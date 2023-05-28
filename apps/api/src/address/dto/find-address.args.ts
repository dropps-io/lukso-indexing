import { ArgsType, Field, Int } from '@nestjs/graphql';
import { CONTRACT_TYPE } from '@models/enums';

@ArgsType()
export class FindAddressArgs {
  @Field(() => String, {
    nullable: false,
    description: 'The search input, can be a complete or incomplete name, address',
  })
  input: string; // This is the page number user wants to fetch.

  @Field(() => String, {
    nullable: true,
    description: 'The type of the contract. E.g. asset, collection, profile, etc.',
  })
  type?: CONTRACT_TYPE;

  @Field(() => String, {
    nullable: true,
    description: 'The interface code, such as ERC721, ERC1155, etc.',
  })
  interfaceCode?: string;

  @Field(() => String, { nullable: true, description: 'The version of the interface.' })
  interfaceVersion?: string;

  @Field(() => Int, { nullable: true, defaultValue: 1, description: 'The page number to query.' })
  page: number; // This is the page number user wants to fetch.
}
