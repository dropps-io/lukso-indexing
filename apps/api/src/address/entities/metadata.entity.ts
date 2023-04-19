import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class MetadataImage {
  @Field({ description: 'The URL of the image.' })
  url: string;

  @Field({ description: 'The width of the image in pixels.' })
  width: number;

  @Field({ description: 'The height of the image in pixels.' })
  height: number;

  @Field({
    nullable: true,
    description: 'The type of the image: profile, background, etc.',
  })
  type: string | null;

  @Field({
    description: 'The unique keccak hash of the image content.',
  })
  hash: string;
}

@ObjectType()
export class MetadataAsset {
  @Field({ description: 'The URL of the asset.' })
  url: string;

  @Field({ description: 'The file type of the asset, such as "application/pdf", etc.' })
  fileType: string;

  @Field({
    description: 'The unique hash of the asset content.',
  })
  hash: string;
}

@ObjectType()
export class MetadataLink {
  @Field({ description: 'The title of the related link.' })
  title: string;

  @Field({ description: 'The URL of the related link.' })
  url: string;
}
