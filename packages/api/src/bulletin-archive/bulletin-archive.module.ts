// packages/api/src/bulletin-archive/bulletin-archive.module.ts
import { Module } from '@nestjs/common';
import { BulletinArchiveController } from './bulletin-archive.controller.js';
import { BulletinArchiveService } from './bulletin-archive.service.js';

@Module({
  controllers: [BulletinArchiveController],
  providers: [BulletinArchiveService],
})
export class BulletinArchiveModule {}
