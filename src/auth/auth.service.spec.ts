import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthService', () => {
  let prisma: {
    otpCode: { create: jest.Mock; findFirst: jest.Mock; update: jest.Mock };
    user: { findUnique: jest.Mock; create: jest.Mock; update: jest.Mock };
  };
  let service: AuthService;

  beforeEach(() => {
    prisma = {
      otpCode: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
      user: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    };
    service = new AuthService(
      prisma as unknown as PrismaService,
      new JwtService(),
    );
  });

  describe('otp login', () => {
    it('creates a user on first-time verification and returns a token pair', async () => {
      let codeHash = '';
      prisma.otpCode.create.mockImplementation(
        (args: { data: { codeHash: string } }) => {
          codeHash = args.data.codeHash;
          return Promise.resolve({});
        },
      );

      const requestResult = await service.requestOtp('+998900000000');

      expect(await bcrypt.compare(requestResult.devCode, codeHash)).toBe(true);

      prisma.otpCode.findFirst.mockResolvedValue({
        id: 'otp-1',
        codeHash,
        expiresAt: new Date(Date.now() + 60_000),
      });
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'user-1',
        name: 'Yangi mijoz',
        phone: '+998900000000',
        email: null,
        createdAt: new Date(),
      });

      const result = await service.verifyOtp(
        '+998900000000',
        requestResult.devCode,
        'Yangi mijoz',
      );

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user.name).toBe('Yangi mijoz');
      expect(
        (result.user as { passwordHash?: string }).passwordHash,
      ).toBeUndefined();
    });

    it('rejects an incorrect code', async () => {
      const codeHash = await bcrypt.hash('111111', 10);
      prisma.otpCode.findFirst.mockResolvedValue({
        id: 'otp-1',
        codeHash,
        expiresAt: new Date(Date.now() + 60_000),
      });

      await expect(
        service.verifyOtp('+998900000000', '222222'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects an expired code', async () => {
      const codeHash = await bcrypt.hash('111111', 10);
      prisma.otpCode.findFirst.mockResolvedValue({
        id: 'otp-1',
        codeHash,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(
        service.verifyOtp('+998900000000', '111111'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('email + password', () => {
    it('rejects registration with an email that is already in use', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.register({
          name: 'A',
          email: 'a@example.com',
          password: 'password1',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects login with the wrong password', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        passwordHash: await bcrypt.hash('correct-password', 10),
      });

      await expect(
        service.login({ email: 'a@example.com', password: 'wrong-password' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('logs in successfully with the correct password', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        name: 'Anvar',
        email: 'a@example.com',
        phone: null,
        passwordHash: await bcrypt.hash('correct-password', 10),
        createdAt: new Date(),
      });

      const result = await service.login({
        email: 'a@example.com',
        password: 'correct-password',
      });

      expect(result.accessToken).toBeDefined();
      expect(result.user.email).toBe('a@example.com');
    });
  });
});
