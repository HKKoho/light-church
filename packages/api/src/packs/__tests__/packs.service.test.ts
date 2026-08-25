import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@clawix/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@clawix/shared')>();
  return {
    ...actual,
    createLogger: vi.fn().mockReturnValue({
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  };
});

function createPrismaMock() {
  return {
    agentDefinition: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
  };
}

import { PacksService } from '../packs.service.js';

describe('PacksService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: PacksService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new PacksService(prisma as any);
  });

  describe('list', () => {
    it('reports not_installed when no agents exist for a pack', async () => {
      prisma.agentDefinition.findMany.mockResolvedValue([]);

      const summaries = await service.list();
      const ngo = summaries.find((s) => s.id === 'ngo')!;

      expect(ngo.status).toBe('not_installed');
      expect(ngo.installedCount).toBe(0);
    });

    it('reports partial when some but not all agents exist', async () => {
      prisma.agentDefinition.findMany.mockImplementation((args: any) =>
        args.where.name.in.includes('pastoral-care')
          ? Promise.resolve([{ name: 'pastoral-care', isActive: true }])
          : Promise.resolve([]),
      );

      const summaries = await service.list();
      const ngo = summaries.find((s) => s.id === 'ngo')!;

      expect(ngo.status).toBe('partial');
      expect(ngo.installedCount).toBe(1);
    });

    it('reports active when all agents exist and are active', async () => {
      const church = (await import('../definitions/church-agents.data.js')).CHURCH_AGENTS;
      prisma.agentDefinition.findMany.mockImplementation((args: any) => {
        if (args.where.name.in.includes('church-sermon-prep')) {
          return Promise.resolve(church.map((a) => ({ name: a.name, isActive: true })));
        }
        return Promise.resolve([]);
      });

      const summaries = await service.list();
      const churchSummary = summaries.find((s) => s.id === 'church')!;

      expect(churchSummary.status).toBe('active');
      expect(churchSummary.installedCount).toBe(church.length);
    });

    it('reports disabled when all agents exist and are inactive', async () => {
      const church = (await import('../definitions/church-agents.data.js')).CHURCH_AGENTS;
      prisma.agentDefinition.findMany.mockImplementation((args: any) => {
        if (args.where.name.in.includes('church-sermon-prep')) {
          return Promise.resolve(church.map((a) => ({ name: a.name, isActive: false })));
        }
        return Promise.resolve([]);
      });

      const summaries = await service.list();
      const churchSummary = summaries.find((s) => s.id === 'church')!;

      expect(churchSummary.status).toBe('disabled');
    });
  });

  describe('install', () => {
    it('creates only missing agents, skipping ones that already exist', async () => {
      const ngo = (await import('../definitions/ngo-agents.data.js')).NGO_AGENTS;
      prisma.agentDefinition.findFirst.mockImplementation(({ where }: any) =>
        where.name === 'pastoral-care' ? Promise.resolve({ id: 'existing' }) : Promise.resolve(null),
      );
      prisma.agentDefinition.findMany.mockResolvedValue(
        ngo.map((a) => ({ name: a.name, isActive: true })),
      );

      await service.install('ngo');

      expect(prisma.agentDefinition.create).toHaveBeenCalledTimes(ngo.length - 1);
      expect(prisma.agentDefinition.create).not.toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ name: 'pastoral-care' }) }),
      );
    });

    it('throws for an unknown pack id', async () => {
      await expect(service.install('does-not-exist')).rejects.toThrow();
    });
  });

  describe('setEnabled', () => {
    it('updates isActive for every agent name in the pack', async () => {
      prisma.agentDefinition.findMany.mockResolvedValue([]);

      await service.setEnabled('church', false);

      expect(prisma.agentDefinition.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isActive: false } }),
      );
    });
  });
});
