import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsEmail, IsString, Length, Matches, MinLength } from 'class-validator';
import { OAuthProvider } from '@ilham/database';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../common/auth.guard';
import type { AuthenticatedRequest } from '../common/auth.types';

class LoginDto {
  /** E-mail address or profile username. */
  @IsString() @MinLength(3) email: string;
  @IsString() @MinLength(8) password: string;
}

class RefreshDto {
  @IsString() @MinLength(32) refreshToken: string;
}

class RegisterDto {
  @IsEmail() email: string;
  /** ≥10 chars with a letter and a digit. */
  @IsString() @Length(10, 128) @Matches(/^(?=.*[A-Za-zÇĞİÖŞÜçğıöşü])(?=.*\d).+$/) password: string;
  @IsString() @Length(2, 80) displayName: string;
}
class EmailDto {
  @IsEmail() email: string;
}
class TokenDto {
  @IsString() @Length(20, 200) token: string;
}
class GoogleLoginDto {
  /** Google ID token (JWT) obtained by the web callback or a native mobile sign-in. */
  @IsString() @Length(100, 4096) idToken: string;
}
class ResetPasswordDto extends TokenDto {
  @IsString() @Length(10, 128) @Matches(/^(?=.*[A-Za-zÇĞİÖŞÜçğıöşü])(?=.*\d).+$/) password: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Email/password login' })
  login(@Body() input: LoginDto, @Req() request: Request) {
    return this.auth.login(input.email, input.password, request.header('user-agent'), request.ip);
  }

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Self-service member sign-up (e-mail verification required)' })
  register(@Body() input: RegisterDto) {
    return this.auth.register(input);
  }

  @Post('verify-email')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Consume an e-mail verification token' })
  verifyEmail(@Body() input: TokenDto) {
    return this.auth.verifyEmail(input.token);
  }

  @Post('resend-verification')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  resendVerification(@Body() input: EmailDto) {
    return this.auth.resendVerification(input.email);
  }

  @Post('forgot-password')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @ApiOperation({ summary: 'Send a password reset link (always 200)' })
  forgotPassword(@Body() input: EmailDto) {
    return this.auth.forgotPassword(input.email);
  }

  @Post('reset-password')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  resetPassword(@Body() input: ResetPasswordDto) {
    return this.auth.resetPassword(input.token, input.password);
  }

  @Post('google')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Sign in / sign up with a verified Google ID token' })
  google(@Body() input: GoogleLoginDto, @Req() request: Request) {
    return this.auth.loginWithGoogle(input.idToken, request.header('user-agent'), request.ip);
  }

  @Get('providers')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Linked identity providers of the current member' })
  providers(@Req() request: AuthenticatedRequest) {
    return this.auth.linkedProviders(request.user.sub);
  }

  @Delete('providers/:provider')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  unlink(@Req() request: AuthenticatedRequest, @Param('provider') provider: string) {
    const key = provider.toUpperCase();
    if (!(key in OAuthProvider)) throw new Error('Bilinmeyen sağlayıcı.');
    return this.auth.unlinkProvider(request.user.sub, key as OAuthProvider);
  }

  @Post('password-setup-link')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @ApiOperation({ summary: 'Mail a one-time link so a provider-only member can create a password' })
  passwordSetup(@Req() request: AuthenticatedRequest) {
    return this.auth.requestPasswordSetup(request.user.sub);
  }

  @Post('refresh')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Rotate a refresh session' })
  refresh(@Body() input: RefreshDto, @Req() request: Request) {
    return this.auth.refresh(input.refreshToken, request.header('user-agent'), request.ip);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Return the currently validated access claims' })
  me(@Req() request: AuthenticatedRequest) {
    return request.user;
  }

  @Post('logout')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Revoke a refresh session' })
  logout(@Body() input: RefreshDto) {
    return this.auth.logout(input.refreshToken);
  }
}
