import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { DiscoveryWorker } from './discovery.worker';
import { SourceRepository } from '../infrastructure/source.repository';
import { AdapterFactory } from '../infrastructure/adapters/adapter.factory';
import { DeduplicationEngine } from './deduplication.engine';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { QUEUES } from '../../../infrastructure/queue/queue.constants';

describe('DiscoveryWorker', () => {
  let worker: DiscoveryWorker;
  let adapterFactory: any;
  let mockAdapter: any;
  let deduplicationEngine: any;
  let sourceRepository: any;

  beforeEach(async () => {
    mockAdapter = {
      fetch: jest.fn(),
    };

    adapterFactory = {
      getAdapter: jest.fn().mockReturnValue(mockAdapter),
    };

    deduplicationEngine = {
      generateHash: jest.fn().mockReturnValue('testhash'),
      isDuplicate: jest.fn(),
    };

    sourceRepository = {
      findById: jest.fn(),
      recordCrawlHistory: jest.fn(),
      incrementArticleCount: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscoveryWorker,
        { provide: SourceRepository, useValue: sourceRepository },
        { provide: AdapterFactory, useValue: adapterFactory },
        { provide: DeduplicationEngine, useValue: deduplicationEngine },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
        {
          provide: PrismaService,
          useValue: {
            article: { create: jest.fn().mockResolvedValue({ id: 'a1' }) },
            source: { update: jest.fn().mockResolvedValue({}) },
          },
        },
        // BullMQ analysis queue mock (needed after CRIT-04 fix: pipeline is now queue-driven)
        {
          provide: getQueueToken(QUEUES.ANALYSIS),
          useValue: { add: jest.fn() },
        },
      ],
    }).compile();

    worker = module.get<DiscoveryWorker>(DiscoveryWorker);
  });

  it('should be defined', () => {
    expect(worker).toBeDefined();
  });

  it('successfully processes a job for a valid RSS feed', async () => {
    sourceRepository.findById.mockResolvedValue({
      id: 's1',
      status: 'ACTIVE',
      type: 'RSS',
      url: 'http://test.com/rss',
    });
    mockAdapter.fetch.mockResolvedValue([
      { title: 'A1', url: 'http://test.com/1' },
    ]);
    deduplicationEngine.isDuplicate.mockResolvedValue(false); // not a duplicate

    await worker.process({ data: { sourceId: 's1' } } as any);

    expect(adapterFactory.getAdapter).toHaveBeenCalledWith('RSS');
    expect(mockAdapter.fetch).toHaveBeenCalledWith('http://test.com/rss');
    expect(sourceRepository.recordCrawlHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        articlesFound: 1,
        articlesNew: 1,
        articlesDedup: 0,
        errors: 0,
      }),
    );
  });
});
