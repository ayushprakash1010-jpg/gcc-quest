import { Test, TestingModule } from '@nestjs/testing';
import { SourceQualityService } from './source-quality.service';
import { SourceRepository } from '../infrastructure/source.repository';
import { SourceEntity } from '../domain/source.entity';

describe('SourceQualityService', () => {
  let service: SourceQualityService;
  let mockRepo: any;

  beforeEach(async () => {
    mockRepo = {
      findAll: jest.fn(),
      updateSystemScores: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SourceQualityService,
        { provide: SourceRepository, useValue: mockRepo },
      ],
    }).compile();

    service = module.get<SourceQualityService>(SourceQualityService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateFreshnessScore', () => {
    it('returns 0 for a source with no recent articles (>30 days)', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 31); // 31 days ago

      const source = new SourceEntity({
        id: '123',
        lastCrawledAt: oldDate,
      });

      const score = service.calculateFreshnessScore(source);
      expect(score).toBe(0);
    });

    it('returns near 1.0 for a source crawled just now', () => {
      const source = new SourceEntity({
        id: '123',
        lastCrawledAt: new Date(),
      });

      const score = service.calculateFreshnessScore(source);
      expect(score).toBeCloseTo(1.0, 1);
    });
  });

  describe('calculateCompositeScore', () => {
    it('recalculates composite_score correctly', () => {
      // Formula: 0.4*trust + 0.4*authority + 0.2*freshness
      // trust: 8, authority: 9, freshness: 1.0 => 3.2 + 3.6 + 0.2 = 7.0
      const score = service.calculateCompositeScore(8, 9, 1.0);
      expect(score).toBe(7.0);
    });
  });
});
