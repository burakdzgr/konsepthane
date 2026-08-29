import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { ConceptsModule } from './concepts/concepts.module';
import { DatabaseModule } from './common/database.module';
import { HealthModule } from './health/health.module';
import { MediaModule } from './media/media.module';
import { CommunityModule } from './community/community.module';
import { SeoModule } from './seo/seo.module';
import { UsersModule } from './users/users.module';
import { GuidesModule } from './guides/guides.module';
import { AuditInterceptor } from './common/audit.interceptor';
import { AuditModule } from './audit/audit.module';
import { BlogModule } from './blog/blog.module';

function validateEnvironment(config: Record<string, unknown>) {
  const required = ['DATABASE_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
  for (const key of required) {
    if (
      typeof config[key] !== 'string' ||
      String(config[key]).length < (key.includes('SECRET') ? 32 : 1)
    ) {
      throw new Error(`Invalid or missing environment variable: ${key}`);
    }
  }
  return config;
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
      validate: validateEnvironment,
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    DatabaseModule,
    AuthModule,
    CategoriesModule,
    ConceptsModule,
    MediaModule,
    CommunityModule,
    SeoModule,
    UsersModule,
    GuidesModule,
    BlogModule,
    HealthModule,
    AuditModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
