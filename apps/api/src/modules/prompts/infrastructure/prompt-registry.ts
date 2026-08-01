import { PromptTemplate } from './prompt.types';
import { analysisV1 } from '../templates/analyzer/analysis.v1';
import { industryNewsV1 } from '../templates/writer/industry-news.v1';
import { expansionV1 } from '../templates/writer/expansion.v1';
import { hiringV1 } from '../templates/writer/hiring.v1';
import { thoughtLeadershipV1 } from '../templates/writer/thought-leadership.v1';
import { researchV1 } from '../templates/writer/research.v1';
import { storyClusterV1 } from '../templates/writer/story-cluster.v1';
import { trendReportV1 } from '../templates/trend-detection/trend-report.v1';

export const PROMPT_REGISTRY: Record<string, PromptTemplate> = {
  'article-analysis': {
    key: 'article-analysis',
    description: 'Analyzes a raw article and extracts structured metadata',
    versions: [{ version: 'v1', render: analysisV1 }],
  },
  'writer-industry-news': {
    key: 'writer-industry-news',
    description: 'Writes a post about general GCC industry news',
    versions: [{ version: 'v1', render: industryNewsV1 }],
  },
  'writer-expansion': {
    key: 'writer-expansion',
    description: 'Writes a post about GCC expansions or new centers',
    versions: [{ version: 'v1', render: expansionV1 }],
  },
  'writer-hiring': {
    key: 'writer-hiring',
    description: 'Writes a post about GCC talent and hiring trends',
    versions: [{ version: 'v1', render: hiringV1 }],
  },
  'writer-thought-leadership': {
    key: 'writer-thought-leadership',
    description: 'Writes a thought leadership post for GCC leaders',
    versions: [{ version: 'v1', render: thoughtLeadershipV1 }],
  },
  'writer-research': {
    key: 'writer-research',
    description: 'Summarizes deep analytical GCC research reports',
    versions: [{ version: 'v1', render: researchV1 }],
  },
  'writer-story-cluster': {
    key: 'writer-story-cluster',
    description:
      'Synthesizes multiple related articles into one clustered story',
    versions: [{ version: 'v1', render: storyClusterV1 }],
  },
  'trend-report': {
    key: 'trend-report',
    description:
      'Generates a long-form trend report based on multiple story clusters',
    versions: [{ version: 'v1', render: trendReportV1 }],
  },
};
