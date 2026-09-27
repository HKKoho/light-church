// packages/api/src/venue-rental/__tests__/venue-rental.service.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { venueApplicationSchema } from '@clawix/shared';

import type { AuditLogRepository } from '../../db/audit-log.repository.js';
import type { VenueApplicationRepository } from '../../db/venue-application.repository.js';
import { VenueRentalService } from '../venue-rental.service.js';

const pastor = { id: 'user-pastor', role: 'pastor' };
const volunteer = { id: 'user-volunteer', role: 'volunteer' };

const application = (extra: Record<string, unknown> = {}) =>
  venueApplicationSchema.parse({
    organization: 'Hope Fellowship',
    contactPerson: '陳大文',
    contactTitle: '先生',
    mobile: '91234567',
    email: 'hope@example.com',
    venueType: '禮堂',
    sessions: [{ date: '2026-11-01', start: '09:00', end: '12:00' }],
    activityNature: '福音性聚會',
    activityMode: '公開聚會',
    targetAudience: ['成年'],
    attendanceRange: '51–100 人',
    description: 'Gospel concert; need projector and 80 chairs',
    repName: '李小明',
    repTitle: '女士',
    ...extra,
  });

type Row = Record<string, unknown> & { id: string };

/** In-memory stand-in for VenueApplicationRepository. */
function fakeRepo() {
  const rows = new Map<string, Row>();
  let seq = 0;
  const repo = {
    rows,
    list: vi.fn(async (status?: string) =>
      [...rows.values()].filter((r) => !status || r['status'] === status),
    ),
    find: vi.fn(async (id: string) => rows.get(id) ?? null),
    create: vi.fn(async (data: Record<string, unknown>) => {
      const row: Row = {
        ...data,
        id: `va-${++seq}`,
        activityFee:
          data['activityFee'] == null ? null : { toNumber: () => Number(data['activityFee']) },
        status: 'pending',
        adminNotes: null,
        reviewedBy: null,
        reviewedAt: null,
        createdAt: new Date('2026-09-27T00:00:00Z'),
      };
      rows.set(row.id, row);
      return row;
    }),
    review: vi.fn(async (id: string, d: { status: string; adminNotes: string | null }) => {
      const row = rows.get(id)!;
      Object.assign(row, d, { reviewedBy: { name: 'Pastor Lee' }, reviewedAt: new Date() });
      return row;
    }),
    delete: vi.fn(async (id: string) => {
      const row = rows.get(id)!;
      rows.delete(id);
      return row;
    }),
  };
  return repo;
}

describe('VenueRentalService', () => {
  let repo: ReturnType<typeof fakeRepo>;
  let audit: { create: ReturnType<typeof vi.fn> };
  let service: VenueRentalService;

  beforeEach(() => {
    repo = fakeRepo();
    audit = { create: vi.fn(async () => ({})) };
    service = new VenueRentalService(
      repo as unknown as VenueApplicationRepository,
      audit as unknown as AuditLogRepository,
    );
  });

  describe('submit', () => {
    it('stores a public application as pending', async () => {
      const { id } = await service.submit(application());
      expect(repo.rows.get(id)).toMatchObject({
        organization: 'Hope Fellowship',
        status: 'pending',
      });
      expect(repo.create.mock.calls[0]![0]).not.toHaveProperty('website');
    });

    it('drops a submission whose honeypot is filled, without storing it', async () => {
      const { id } = await service.submit(application({ website: 'http://spam.example' }));
      expect(id).toBeTruthy();
      expect(repo.create).not.toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('lets reviewers see applications, with numbers and ISO dates', async () => {
      await service.submit(application({ activityMode: '收費活動', activityFee: 50 }));
      const [info] = await service.list(pastor);
      expect(info).toMatchObject({
        activityFee: 50,
        status: 'pending',
        reviewedByName: null,
        createdAt: '2026-09-27T00:00:00.000Z',
      });
    });

    it('filters by status', async () => {
      await service.submit(application());
      expect(await service.list(pastor, 'approved')).toEqual([]);
      expect(repo.list).toHaveBeenCalledWith('approved');
    });

    it('forbids non-reviewers', async () => {
      await expect(service.list(volunteer)).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('review', () => {
    it('approves with notes and writes an audit entry', async () => {
      const { id } = await service.submit(application());
      const info = await service.review(id, { status: 'approved', adminNotes: 'OK' }, pastor);
      expect(info).toMatchObject({
        status: 'approved',
        adminNotes: 'OK',
        reviewedByName: 'Pastor Lee',
      });
      expect(audit.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: pastor.id,
          action: 'venue-rental.review',
          resourceId: id,
        }),
      );
    });

    it('stores empty notes as null', async () => {
      const { id } = await service.submit(application());
      await service.review(id, { status: 'rejected', adminNotes: '' }, pastor);
      expect(repo.review).toHaveBeenCalledWith(id, {
        status: 'rejected',
        adminNotes: null,
        reviewedById: pastor.id,
      });
    });

    it('404s an unknown application', async () => {
      await expect(service.review('nope', { status: 'approved' }, pastor)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('forbids non-reviewers', async () => {
      const { id } = await service.submit(application());
      await expect(service.review(id, { status: 'approved' }, volunteer)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });

  describe('remove', () => {
    it('deletes and audits', async () => {
      const { id } = await service.submit(application());
      await service.remove(id, pastor);
      expect(repo.rows.has(id)).toBe(false);
      expect(audit.create).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'venue-rental.delete', resourceId: id }),
      );
    });

    it('404s an unknown application', async () => {
      await expect(service.remove('nope', pastor)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('forbids non-reviewers', async () => {
      await expect(service.remove('x', volunteer)).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
