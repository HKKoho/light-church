import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PrismaService } from '../../prisma/prisma.service.js';
import { ChurchSiteRepository } from '../church-site.repository.js';

const row = { id: 'default', churchName: 'Example Church' };

function mockPrisma() {
  return {
    churchSite: {
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
  };
}

describe('ChurchSiteRepository', () => {
  let prisma: ReturnType<typeof mockPrisma>;
  let repo: ChurchSiteRepository;

  beforeEach(() => {
    prisma = mockPrisma();
    repo = new ChurchSiteRepository(prisma as unknown as PrismaService);
  });

  describe('getSite', () => {
    it('returns the existing row', async () => {
      prisma.churchSite.findUnique.mockResolvedValue(row);
      expect(await repo.getSite()).toBe(row);
      expect(prisma.churchSite.create).not.toHaveBeenCalled();
    });

    it('creates the row on first use', async () => {
      prisma.churchSite.findUnique.mockResolvedValue(null);
      prisma.churchSite.create.mockResolvedValue(row);
      expect(await repo.getSite()).toBe(row);
      expect(prisma.churchSite.create).toHaveBeenCalledWith({ data: { id: 'default' } });
    });

    it('reads the winner’s row when a parallel request created it first', async () => {
      prisma.churchSite.findUnique.mockResolvedValue(null);
      prisma.churchSite.create.mockRejectedValue(
        Object.assign(new Error('dup'), { code: 'P2002' }),
      );
      prisma.churchSite.findUniqueOrThrow.mockResolvedValue(row);
      expect(await repo.getSite()).toBe(row);
    });

    it('rethrows other errors', async () => {
      prisma.churchSite.findUnique.mockResolvedValue(null);
      prisma.churchSite.create.mockRejectedValue(new Error('db down'));
      await expect(repo.getSite()).rejects.toThrow('db down');
    });
  });

  describe('claimImport', () => {
    it('claims only when no import is running', async () => {
      prisma.churchSite.findUnique.mockResolvedValue(row);
      prisma.churchSite.updateMany.mockResolvedValueOnce({ count: 1 });
      expect(await repo.claimImport('https://a.org')).toBe(true);
      expect(prisma.churchSite.updateMany).toHaveBeenCalledWith({
        where: { id: 'default', importStatus: { not: 'running' } },
        data: { importStatus: 'running', importError: null, sourceUrl: 'https://a.org' },
      });
      prisma.churchSite.updateMany.mockResolvedValueOnce({ count: 0 });
      expect(await repo.claimImport('https://a.org')).toBe(false);
    });
  });
});
