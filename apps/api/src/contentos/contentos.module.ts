import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module';
import { ContentosController } from './contentos.controller';
import { ContentosService } from './contentos.service';
import { ContentosServiceGuard } from './service-token.guard';

/** ContentOS publishing bridge: the receiving side of the v1 contract. */
@Module({
  imports: [MediaModule],
  controllers: [ContentosController],
  providers: [ContentosService, ContentosServiceGuard],
})
export class ContentosModule {}
