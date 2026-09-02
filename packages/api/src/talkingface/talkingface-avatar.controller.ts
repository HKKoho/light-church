import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { createLogger } from '@clawix/shared';

import { Roles } from '../auth/roles.decorator.js';
import type { JwtPayload } from '../auth/auth.types.js';
import { UserRole } from '../generated/prisma/enums.js';

const logger = createLogger('talkingface:avatar');

/** Where uploaded avatar photos are stored on disk. */
export const AVATAR_STORE_DIR = process.env['TALKINGFACE_AVATAR_DIR'] ?? './data/talkingface-avatars';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export interface AvatarUploadResult {
  readonly photoId: string;
  readonly filename: string;
}

export interface AvatarListItem {
  readonly photoId: string;
  readonly filename: string;
  readonly uploadedAt: string;
}

/**
 * Admin-only REST endpoints for managing avatar photos used by the
 * photo-realistic talking-face pipeline (SadTalker).
 *
 * All routes require the `super_admin` or `admin_staff` role — the guard is
 * set at the controller level so every method inherits it.
 */
@ApiTags('talkingface')
@Controller('api/v1/talkingface/avatar')
@Roles(UserRole.super_admin, UserRole.admin_staff)
export class TalkingFaceAvatarController {
  /** POST /api/v1/talkingface/avatar/upload */
  @Post('upload')
  async upload(
    @Req() req: FastifyRequest & { user: JwtPayload },
  ): Promise<AvatarUploadResult> {
    const data = await req.file();
    if (!data) throw new BadRequestException('No file uploaded');

    if (!ALLOWED_MIME.has(data.mimetype)) {
      throw new BadRequestException(`Unsupported image type: ${data.mimetype}. Use JPEG, PNG, or WebP.`);
    }

    const buffer = await data.toBuffer();
    if (buffer.byteLength > MAX_SIZE_BYTES) {
      throw new BadRequestException('Image exceeds 10 MB limit');
    }

    const photoId = crypto.randomUUID();
    const ext = data.mimetype === 'image/png' ? '.png' : data.mimetype === 'image/webp' ? '.webp' : '.jpg';
    const storedFilename = `${photoId}${ext}`;

    await fs.mkdir(AVATAR_STORE_DIR, { recursive: true });
    await fs.writeFile(path.join(AVATAR_STORE_DIR, storedFilename), buffer);

    // Persist metadata alongside the image for listing
    await fs.writeFile(
      path.join(AVATAR_STORE_DIR, `${photoId}.meta.json`),
      JSON.stringify({ photoId, filename: data.filename, uploadedAt: new Date().toISOString() }),
    );

    logger.info({ photoId, uploadedBy: req.user.sub }, 'Avatar photo uploaded');
    return { photoId, filename: data.filename };
  }

  /** GET /api/v1/talkingface/avatar — list all uploaded avatars */
  @Get()
  async list(): Promise<AvatarListItem[]> {
    await fs.mkdir(AVATAR_STORE_DIR, { recursive: true });
    const entries = await fs.readdir(AVATAR_STORE_DIR);
    const metaFiles = entries.filter((f) => f.endsWith('.meta.json'));

    const items = await Promise.all(
      metaFiles.map(async (f) => {
        const raw = await fs.readFile(path.join(AVATAR_STORE_DIR, f), 'utf8');
        return JSON.parse(raw) as AvatarListItem;
      }),
    );

    return items.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  }

  /** GET /api/v1/talkingface/avatar/:photoId — serve the image */
  @Get(':photoId')
  async serve(
    @Param('photoId') photoId: string,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const file = await this.resolvePhotoPath(photoId);
    const buffer = await fs.readFile(file.fullPath);
    const mime = file.ext === '.png' ? 'image/png' : file.ext === '.webp' ? 'image/webp' : 'image/jpeg';
    void reply.type(mime).send(buffer);
  }

  /** DELETE /api/v1/talkingface/avatar/:photoId */
  @Delete(':photoId')
  async remove(
    @Param('photoId') photoId: string,
    @Req() req: FastifyRequest & { user: JwtPayload },
  ): Promise<{ deleted: boolean }> {
    const file = await this.resolvePhotoPath(photoId);
    await fs.rm(file.fullPath, { force: true });
    await fs.rm(path.join(AVATAR_STORE_DIR, `${photoId}.meta.json`), { force: true });
    logger.info({ photoId, deletedBy: req.user.sub }, 'Avatar photo deleted');
    return { deleted: true };
  }

  // --- helpers ---

  async readPhotoBuffer(photoId: string): Promise<Buffer> {
    const file = await this.resolvePhotoPath(photoId);
    return fs.readFile(file.fullPath);
  }

  private async resolvePhotoPath(photoId: string): Promise<{ fullPath: string; ext: string }> {
    // Prevent path traversal
    if (!/^[\w-]+$/.test(photoId)) throw new BadRequestException('Invalid photoId');

    for (const ext of ['.jpg', '.png', '.webp']) {
      const fullPath = path.join(AVATAR_STORE_DIR, `${photoId}${ext}`);
      try {
        await fs.access(fullPath);
        return { fullPath, ext };
      } catch {
        // try next extension
      }
    }
    throw new NotFoundException(`Avatar photo not found: ${photoId}`);
  }
}
