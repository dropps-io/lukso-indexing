import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

import { MetadataImageDto } from './metadata-image.dto';

export class AddressDTO {
  @IsNotEmpty()
  @ApiProperty({
    description: '',
    example: '',
  })
  readonly address: string;

  @ApiProperty({
    description: '',
    example: '',
  })
  readonly interface: {
    code: string;
    version: string;
  };

  @ApiProperty({
    description: '',
    example: '',
  })
  readonly name: string;

  @ApiProperty({
    description: '',
    example: '',
  })
  readonly description: string;

  @IsNotEmpty()
  @ApiProperty({
    description: '',
    example: '',
  })
  readonly images: MetadataImageDto[];

  @IsNotEmpty()
  @ApiProperty({
    description: '',
    example: '',
  })
  readonly tags: string[];

  @IsNotEmpty()
  @ApiProperty({
    description: '',
    example: '',
  })
  readonly links: { title: string; url: string }[];
}
