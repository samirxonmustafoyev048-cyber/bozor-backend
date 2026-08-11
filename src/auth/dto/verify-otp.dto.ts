import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import {
  UZ_PHONE_MESSAGE,
  UZ_PHONE_REGEX,
  normalizeUzPhone,
} from '../../common/phone';

export class VerifyOtpDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => normalizeUzPhone(value))
  @Matches(UZ_PHONE_REGEX, { message: UZ_PHONE_MESSAGE })
  phone: string;

  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'Tasdiqlash kodi 6 ta raqamdan iborat' })
  code: string;

  @IsOptional()
  @IsString()
  name?: string;
}
