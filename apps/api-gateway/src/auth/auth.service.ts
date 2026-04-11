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
      accessToken: await this.jwtService.signAsync(user),
      tokenType: 'Bearer',
      expiresIn: config.jwtExpiresIn,
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
}

