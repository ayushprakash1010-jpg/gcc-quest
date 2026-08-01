import { Test, TestingModule } from '@nestjs/testing';
import { DeduplicationEngine } from './deduplication.engine';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

describe('DeduplicationEngine', () => {
  let engine: DeduplicationEngine;
  let prisma: PrismaService;

  beforeEach(async () => {
    const mockPrisma = {
      article: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeduplicationEngine,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    engine = module.get<DeduplicationEngine>(DeduplicationEngine);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(engine).toBeDefined();
  });

  it('exact same title/url/text yields same hash', () => {
    const hash1 = engine.generateHash(
      'http://example.com',
      'Test Title',
      'Some content',
    );
    const hash2 = engine.generateHash(
      'http://example.com',
      'Test Title',
      'Some content',
    );
    expect(hash1).toEqual(hash2);
  });

  it('isDuplicate returns true if hash exists in DB', async () => {
    jest
      .spyOn(prisma.article, 'findUnique')
      .mockResolvedValue({ id: '123' } as any);
    const result = await engine.isDuplicate('somehash');
    expect(result).toBe(true);
  });

  it('isDuplicate returns false if hash does not exist in DB', async () => {
    jest.spyOn(prisma.article, 'findUnique').mockResolvedValue(null);
    const result = await engine.isDuplicate('somehash');
    expect(result).toBe(false);
  });
});
