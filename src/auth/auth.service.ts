import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { PhoneLoginDto } from './dto/phone-login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

const OTP_TTL_MS = 5 * 60 * 1000;
const ACCESS_EXPIRES_IN = '15m';
const REFRESH_EXPIRES_IN = '30d';

function getAccessSecret() {
  return process.env.JWT_ACCESS_SECRET ?? 'dev_access_secret_change_me';
}

function getRefreshSecret() {
  return process.env.JWT_REFRESH_SECRET ?? 'dev_refresh_secret_change_me';
}

function generateOtpCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function sanitizeUser<T extends { passwordHash?: string | null }>(user: T) {
  return {
    ...user,
    passwordHash: undefined,
  };
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async requestOtp(phone: string) {
    const code = generateOtpCode();
    const codeHash = await bcrypt.hash(code, 10);

    await this.prisma.otpCode.create({
      data: {
        phone,
        codeHash,
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
      },
    });

    // No SMS gateway wired up yet — log the code and echo it back so the
    // flow is testable end-to-end. Replace with Eskiz/Play Mobile before
    // going to production and drop `devCode` from the response.
    console.log(`[SMS OTP] ${phone}: ${code}`);

    return { message: 'Tasdiqlash kodi yuborildi', devCode: code };
  }

  async verifyOtp(phone: string, code: string, name?: string) {
    const otp = await this.prisma.otpCode.findFirst({
      where: { phone, consumed: false },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp || otp.expiresAt < new Date()) {
      throw new BadRequestException('Kod eskirgan yoki topilmadi');
    }

    const isValid = await bcrypt.compare(code, otp.codeHash);
    if (!isValid) {
      throw new BadRequestException("Kod noto'g'ri");
    }

    await this.prisma.otpCode.update({
      where: { id: otp.id },
      data: { consumed: true },
    });

    let user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) {
      user = await this.prisma.user.create({
        data: { phone, name: name?.trim() || 'Mijoz' },
      });
    }

    return this.issueTokens(user);
  }

  /**
   * Signs in by phone number alone, creating the account on first use.
   *
   * NOTE: nothing proves the caller owns the number — knowing someone's phone
   * is enough to sign in as them. That is the tradeoff of dropping the SMS
   * code; requestOtp/verifyOtp above stay in place for when an SMS gateway
   * (Eskiz, Play Mobile) is wired up and this can be swapped back.
   */
  async phoneLogin(dto: PhoneLoginDto) {
    const name = `${dto.firstName.trim()} ${dto.lastName.trim()}`.trim();

    const user = await this.prisma.user.upsert({
      where: { phone: dto.phone },
      update: { name },
      create: { phone: dto.phone, name },
    });

    return this.issueTokens(user);
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException("Bu email allaqachon ro'yxatdan o'tgan");
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: { name: dto.name, email: dto.email, passwordHash },
    });

    return this.issueTokens(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user?.passwordHash) {
      throw new UnauthorizedException("Email yoki parol noto'g'ri");
    }

    const isValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException("Email yoki parol noto'g'ri");
    }

    return this.issueTokens(user);
  }

  async refresh(refreshToken: string) {
    let payload: { sub: string };
    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: getRefreshSecret(),
      });
    } catch {
      throw new UnauthorizedException('Refresh token yaroqsiz');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user) {
      throw new UnauthorizedException('Foydalanuvchi topilmadi');
    }

    return this.issueTokens(user);
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('Foydalanuvchi topilmadi');
    }
    return sanitizeUser(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: dto,
    });
    return sanitizeUser(user);
  }

  private async issueTokens(user: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    passwordHash?: string | null;
    createdAt: Date;
  }) {
    const payload = { sub: user.id };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: getAccessSecret(),
        expiresIn: ACCESS_EXPIRES_IN,
      }),
      this.jwtService.signAsync(payload, {
        secret: getRefreshSecret(),
        expiresIn: REFRESH_EXPIRES_IN,
      }),
    ]);

    return { accessToken, refreshToken, user: sanitizeUser(user) };
  }
}
