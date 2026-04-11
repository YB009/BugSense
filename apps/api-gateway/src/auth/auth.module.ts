import { Module } from '@nestjs/common';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { getApiGatewayRuntimeConfig } from '../config/runtime-config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt.guard';
import { ProjectApiKeyGuard } from './project-api-key.guard';

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => {
        const config = getApiGatewayRuntimeConfig();
        return {
          secret: config.jwtSecret,
          signOptions: {
            expiresIn: config.jwtExpiresIn,
          },
        } as JwtModuleOptions;
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, ProjectApiKeyGuard],
  exports: [AuthService, JwtAuthGuard, ProjectApiKeyGuard],
})
export class AuthModule {}
