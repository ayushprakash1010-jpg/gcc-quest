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
