import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { TokenEncryptionService } from '../../common/encryption/token-encryption.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private encryption: TokenEncryptionService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (
      user &&
      user.passwordHash &&
      (await bcrypt.compare(pass, user.passwordHash))
    ) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { passwordHash: _passwordHash, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { sub: user.id, email: user.email, role: user.role };

    // Generate access token
    const accessToken = this.jwtService.sign(payload);

    // Generate refresh token manually since we need different secret/expiry
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get<string>(
        'JWT_REFRESH_EXPIRES_IN',
        '7d',
      ) as any,
    });

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  async refreshAccessToken(user: any) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return this.jwtService.sign(payload);
  }

  async linkOAuthAccount(
    userId: string,
    data: {
      provider: string;
      providerAccountId: string;
      accessToken: string;
      refreshToken?: string;
      expiresAt?: Date;
    },
  ) {
    // CRIT-01: Encrypt tokens before storing — tokens are NEVER written to DB in plaintext
    const encryptedAccessToken = this.encryption.encrypt(data.accessToken);
    const encryptedRefreshToken = data.refreshToken
      ? this.encryption.encrypt(data.refreshToken)
      : undefined;

    return this.prisma.oAuthConnection.upsert({
      where: {
        userId_provider: {
          userId,
          provider: data.provider,
        },
      },
      update: {
        providerAccountId: data.providerAccountId,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt: data.expiresAt,
      },
      create: {
        userId,
        provider: data.provider,
        providerAccountId: data.providerAccountId,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt: data.expiresAt,
      },
    });
  }

  async deleteOAuthConnection(userId: string, provider: string) {
    try {
      await this.prisma.oAuthConnection.delete({
        where: {
          userId_provider: {
            userId,
            provider,
          },
        },
      });
      return true;
    } catch {
      // Ignore if not found
      return false;
    }
  }

  async getUserProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        lastLoginAt: true,
      },
    });

    const linkedInConnection = await this.prisma.oAuthConnection.findUnique({
      where: {
        userId_provider: {
          userId,
          provider: 'linkedin',
        },
      },
    });

    return {
      ...user,
      hasLinkedInConnection: !!linkedInConnection,
    };
  }

  async updatePassword(userId: string, newPassword: string) {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
    return true;
  }
}
