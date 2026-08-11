import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';
import {
  UZ_PHONE_MESSAGE,
  UZ_PHONE_REGEX,
  normalizeUzPhone,
} from '../../common/phone';

export class PhoneLoginDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => normalizeUzPhone(value))
  @Matches(UZ_PHONE_REGEX, { message: UZ_PHONE_MESSAGE })
  phone: string;

  @IsString()
  @IsNotEmpty({ message: 'Ism kiritilishi shart' })
  @MaxLength(50)
  firstName: string;

  @IsString()
  @IsNotEmpty({ message: 'Familiya kiritilishi shart' })
  @MaxLength(50)
  lastName: string;
}
