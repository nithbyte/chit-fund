import { Module } from '@nestjs/common';
import { ChitGroupsService } from './chit-groups.service.js';
import { ChitGroupsController } from './chit-groups.controller.js';

@Module({
  controllers: [ChitGroupsController],
  providers: [ChitGroupsService],
  exports: [ChitGroupsService],
})
export class ChitGroupsModule {}
