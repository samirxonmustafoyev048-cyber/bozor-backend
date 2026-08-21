import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { IsImageUrl } from '../../common/image-url';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  slug: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  icon: string;

  @IsOptional()
  @IsImageUrl()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  parentId?: string;
}
