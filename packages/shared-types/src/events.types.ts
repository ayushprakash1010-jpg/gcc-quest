export const DomainEvents = {
  ARTICLE_DISCOVERED: "article.discovered",
  ARTICLE_ANALYZED: "article.analyzed",
  ARTICLE_EMBEDDED: "article.embedded",
  SEMANTIC_DUPLICATE_FOUND: "article.semantic_duplicate_found",
  CRAWL_COMPLETED: "crawl.completed",
  DRAFT_APPROVED: "draft.approved",
  FEEDBACK_CAPTURED: "feedback.captured",
  CLUSTER_FORMED: "cluster.formed",
  CLUSTER_FINALIZED: "cluster.finalized",
  TREND_DETECTED: "trend.detected",
} as const;

export interface ArticleDiscoveredEvent {
  articleId: string;
  sourceId: string;
}

export interface ArticleAnalyzedEvent {
  articleId: string;
}

export interface ArticleEmbeddedEvent {
  articleId: string;
}

export interface SemanticDuplicateFoundEvent {
  articleId: string;
  clusterId?: string;
}

export interface DraftCreatedEvent {
  draftId: string;
  articleId?: string;
  clusterId?: string;
  trendId?: string;
}

export interface DraftApprovedEvent {
  draftId: string;
}

export interface PostScheduledEvent {
  scheduledPostId: string;
  draftId: string;
}
