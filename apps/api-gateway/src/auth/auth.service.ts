import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { getApiGatewayRuntimeConfig } from '../config/runtime-config';

export interface JwtUser {
  sub: string;
  email: string;
  role: 'admin';
}

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async login(email: string | undefined, password: string | undefined) {
    const config = getApiGatewayRuntimeConfig();

    if (
      email !== config.dashboardAdminEmail ||
      password !== config.dashboardAdminPassword
    ) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const user: JwtUser = {
      sub: 'admin',
      email,
      role: 'admin',
    };

    return {
      ...(await this.issueAccessToken(user)),
      authProvider: 'password',
    };
  }

  async loginWithGoogle(idToken: string | undefined) {
    if (!idToken) {
      throw new UnauthorizedException('Missing Google credential');
    }

    const config = getApiGatewayRuntimeConfig();
    if (!config.googleClientId) {
      throw new UnauthorizedException('Google login is not configured');
    }

    const response = await fetch('https://oauth2.googleapis.com/tokeninfo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        id_token: idToken,
      }),
    });

    if (!response.ok) {
      throw new UnauthorizedException('Invalid Google credential');
    }

    const payload = (await response.json()) as GoogleTokenInfo;
    if (payload.aud !== config.googleClientId) {
      throw new UnauthorizedException('Google credential audience mismatch');
    }

    if (payload.email_verified !== 'true' || !payload.email) {
      throw new UnauthorizedException('Google email is not verified');
    }

    const email = payload.email.trim().toLowerCase();
    const isAdminEmail =
      email === config.dashboardAdminEmail.trim().toLowerCase();
    const domain = email.split('@')[1] ?? '';
    const isAllowedEmail = config.googleAllowedEmails.some(
      (entry) => entry.toLowerCase() === email,
    );
    const isAllowedDomain = config.googleAllowedDomains.some(
      (entry) => entry.toLowerCase() === domain.toLowerCase(),
    );

    if (
      !config.googleAllowSignup &&
      !isAdminEmail &&
      !isAllowedEmail &&
      !isAllowedDomain
    ) {
      throw new UnauthorizedException('Google account is not allowed');
    }

    const user: JwtUser = {
      sub: payload.sub ?? email,
      email,
      role: 'admin',
    };

    return {
      ...(await this.issueAccessToken(user)),
      authProvider: 'google',
    };
  }

  validateProjectApiKey(projectId: string, apiKey: string | undefined) {
    const config = getApiGatewayRuntimeConfig();
    const expectedApiKey = config.projectApiKeys[projectId];

    if (!apiKey) {
      throw new UnauthorizedException('Missing x-bugsense-api-key header');
    }

    if (!expectedApiKey) {
      throw new UnauthorizedException('Unknown projectId');
    }

    if (expectedApiKey !== apiKey) {
      throw new UnauthorizedException('Invalid project API key');
    }
  }

  async verifyAccessToken(token: string) {
    try {
      return await this.jwtService.verifyAsync<JwtUser>(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }

  private async issueAccessToken(user: JwtUser) {
    const config = getApiGatewayRuntimeConfig();

    return {
      accessToken: await this.jwtService.signAsync(user),
      tokenType: 'Bearer',
      expiresIn: config.jwtExpiresIn,
      user,
    };
  }
}

interface GoogleTokenInfo {
  aud?: string;
  email?: string;
  email_verified?: string;
  sub?: string;
}
