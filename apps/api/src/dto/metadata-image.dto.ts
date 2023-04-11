import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class MetadataImageDto {
  @IsNotEmpty()
  @ApiProperty({
    description: '',
    example: '',
  })
  readonly url: string;

  @ApiProperty({
    description: '',
    example: '',
  })
  readonly type: string;

  @IsNotEmpty()
  @ApiProperty({
    description: '',
    example: '',
  })
  readonly width: number;

  @IsNotEmpty()
  @ApiProperty({
    description: '',
    example: '',
  })
  readonly height: number;

  @IsNotEmpty()
  @ApiProperty({
    description: '',
    example: '',
  })
  readonly hash: string;
}
