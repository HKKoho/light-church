// packages/api/src/venue-rental/venue-rental.controller.ts
import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  replyVenueApplicationSchema,
  reviewVenueApplicationSchema,
  VENUE_APPLICATION_STATUSES,
  venueApplicationSchema,
} from '@clawix/shared';
import type {
  ReplyVenueApplicationInput,
  ReviewVenueApplicationInput,
  VenueApplicationData,
  VenueApplicationInfo,
  VenueApplicationStatus,
  VenueMailStatus,
} from '@clawix/shared';

import type { JwtPayload } from '../auth/auth.types.js';
import { Public } from '../auth/public.decorator.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { VenueRentalService, type Actor } from './venue-rental.service.js';

// The public form is the only unauthenticated write in Light Church: keep it
// to a handful of submissions per IP (PolicyThrottlerGuard tracks by IP when
// signed out; main.ts trusts the proxy's X-Forwarded-For).
const SUBMIT_LIMIT = 5;
const SUBMIT_TTL_MS = 60 * 60 * 1000;

interface AuthedRequest {
  user: JwtPayload;
}
const actor = (req: AuthedRequest): Actor => ({ id: req.user.sub, role: req.user.role });

const isStatus = (s: string | undefined): s is VenueApplicationStatus =>
  (VENUE_APPLICATION_STATUSES as readonly string[]).includes(s ?? '');

@ApiTags('venue-rental')
@Controller('api/v1/venue-rental')
export class VenueRentalController {
  constructor(private readonly service: VenueRentalService) {}

  @Public()
  @Throttle({ default: { limit: SUBMIT_LIMIT, ttl: SUBMIT_TTL_MS } })
  @Post('applications')
  async submit(
    @Body(new ZodValidationPipe(venueApplicationSchema)) body: VenueApplicationData,
  ): Promise<{ success: boolean; data: { id: string } }> {
    return { success: true, data: await this.service.submit(body) };
  }

  @Get('applications')
  async list(
    @Req() req: AuthedRequest,
    @Query('status') status?: string,
  ): Promise<{ success: boolean; data: VenueApplicationInfo[] }> {
    const filter = isStatus(status) ? status : undefined;
    return { success: true, data: await this.service.list(actor(req), filter) };
  }

  @Put('applications/:id/review')
  async review(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(reviewVenueApplicationSchema)) body: ReviewVenueApplicationInput,
  ): Promise<{ success: boolean; data: VenueApplicationInfo }> {
    return { success: true, data: await this.service.review(id, body, actor(req)) };
  }

  @Get('mail')
  async mailStatus(
    @Req() req: AuthedRequest,
  ): Promise<{ success: boolean; data: VenueMailStatus }> {
    return { success: true, data: await this.service.mailStatus(actor(req)) };
  }

  @Post('applications/:id/reply')
  async reply(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(replyVenueApplicationSchema)) body: ReplyVenueApplicationInput,
  ): Promise<{ success: boolean; data: VenueApplicationInfo }> {
    return { success: true, data: await this.service.reply(id, body, actor(req)) };
  }

  @Delete('applications/:id')
  async remove(@Req() req: AuthedRequest, @Param('id') id: string): Promise<{ success: boolean }> {
    await this.service.remove(id, actor(req));
    return { success: true };
  }
}
