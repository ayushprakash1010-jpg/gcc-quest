import {
  Controller,
  Post,
  UseGuards,
  Request,
  Get,
  Res,
  Body,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '@gcc-quest/shared-types';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(AuthGuard('local'))
  @Post('login')
  async login(@Request() req: any, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken } = await this.authService.login(
      req.user,
    );

    // Set refresh token as httpOnly cookie
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/v1/auth', // Restrict to auth paths
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return { accessToken };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Request() req: any, @Res({ passthrough: true }) res: Response) {
    // In a real app we might extract the refresh token and revoke it via the DB
    // Here we just clear the cookie
    res.clearCookie('refresh_token', { path: '/api/v1/auth' });
    return { success: true };
  }

  @UseGuards(AuthGuard('jwt-refresh'))
  @Post('refresh')
  async refresh(@Request() req: any) {
    const accessToken = await this.authService.refreshAccessToken(req.user);
    return { accessToken };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@CurrentUser() user: User) {
    return this.authService.getUserProfile(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('oauth-connect')
  async linkOAuth(
    @CurrentUser() user: User,
    @Body()
    body: {
      provider: string;
      providerAccountId: string;
      accessToken: string;
      refreshToken?: string;
      expiresAt?: string | number;
    },
  ) {
    let expiresAtDate: Date | undefined = undefined;
    if (body.expiresAt) {
      if (typeof body.expiresAt === 'number') {
        // If it's in seconds since epoch (like NextAuth sometimes provides)
        // Check if it's seconds or milliseconds. If it's < 10^12, likely seconds
        if (body.expiresAt < 10000000000) {
          expiresAtDate = new Date(body.expiresAt * 1000);
        } else {
          expiresAtDate = new Date(body.expiresAt);
        }
      } else {
        expiresAtDate = new Date(body.expiresAt);
      }
    }

    await this.authService.linkOAuthAccount(user.id, {
      provider: body.provider,
      providerAccountId: body.providerAccountId,
      accessToken: body.accessToken,
      refreshToken: body.refreshToken,
      expiresAt: expiresAtDate,
    });
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Post('oauth-disconnect/:provider')
  async unlinkOAuth(@CurrentUser() user: User, @Request() req: any) {
    const provider = req.params.provider;
    const success = await this.authService.deleteOAuthConnection(
      user.id,
      provider,
    );
    return { success };
  }

  @UseGuards(JwtAuthGuard)
  @Post('password')
  async updatePassword(
    @CurrentUser() user: User,
    @Body() body: { newPassword: string },
  ) {
    if (!body.newPassword || body.newPassword.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }
    await this.authService.updatePassword(user.id, body.newPassword);
    return { success: true };
  }
}
