import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { DatabaseService } from '../common/database.module';

@Controller('health')
export class HealthController {
  constructor(private readonly db: DatabaseService) {}
  @Get('live') live() {
    return { status: 'ok', service: 'api', timestamp: new Date().toISOString() };
  }
  @Get('ready') async ready() {
    try {
      await this.db.$queryRaw`SELECT 1`;
      return { status: 'ready', database: 'up' };
    } catch {
      throw new ServiceUnavailableException({ status: 'not_ready', database: 'down' });
    }
  }
}
