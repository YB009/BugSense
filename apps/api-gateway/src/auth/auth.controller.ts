import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt.guard';

interface LoginRequest {
  email?: string;
  password?: string;
}

interface GoogleLoginRequest {
  credential?: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() payload: LoginRequest) {
    return this.authService.login(payload.email, payload.password);
  }

  @Post('google')
  async loginWithGoogle(@Body() payload: GoogleLoginRequest) {
    return this.authService.loginWithGoogle(payload.credential);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getCurrentUser(@Req() request: { user?: unknown }) {
    return {
      user: request.user,
    };
  }
}
