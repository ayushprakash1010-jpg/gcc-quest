export const DomainEvents = {
  // Discovery Context
  ARTICLE_DISCOVERED: 'article.discovered',
  ARTICLE_DEDUPLICATED: 'article.deduplicated',
  ARTICLE_SKIPPED: 'article.skipped',
  CRAWL_COMPLETED: 'crawl.completed',
  SOURCE_ERROR: 'source.error',

  // Intelligence Context
  ARTICLE_ANALYZED: 'article.analyzed',
  ARTICLE_EMBEDDED: 'article.embedded',
  SEMANTIC_DUPLICATE_FOUND: 'article.semantic_duplicate',

  // Content Context
  DRAFT_CREATED: 'draft.created',
  DRAFT_APPROVED: 'draft.approved',
  DRAFT_REJECTED: 'draft.rejected',
  DRAFT_REGENERATED: 'draft.regenerated',

  // Clustering + Trends
  CLUSTER_FORMED: 'cluster.formed',
  CLUSTER_FINALIZED: 'cluster.finalized',
  TREND_DETECTED: 'trend.detected',

  // Scheduling
  POST_SCHEDULED: 'post.scheduled',
  POST_PUBLISHED: 'post.published',

  // Feedback
  FEEDBACK_CAPTURED: 'feedback.captured',
} as const;
