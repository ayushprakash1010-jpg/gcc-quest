-- CreateTable
CREATE TABLE "article_analyses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "article_id" UUID NOT NULL,
    "summary" TEXT NOT NULL,
    "sentiment" VARCHAR(50) NOT NULL,
    "gcc_category" VARCHAR(100) NOT NULL,
    "entities" JSONB NOT NULL DEFAULT '{}',
    "impact_score" DOUBLE PRECISION NOT NULL,
    "prompt_key" VARCHAR(100) NOT NULL,
    "prompt_version" VARCHAR(20) NOT NULL,
    "reanalysis_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "article_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand_voices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "tone" TEXT NOT NULL,
    "guidelines" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brand_voices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_runs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "run_type" VARCHAR(100) NOT NULL,
    "prompt_key" VARCHAR(100),
    "prompt_version" VARCHAR(20),
    "model" VARCHAR(100) NOT NULL,
    "tokens_input" INTEGER NOT NULL DEFAULT 0,
    "tokens_output" INTEGER NOT NULL DEFAULT 0,
    "cost_usd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "latency_ms" INTEGER,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "error_message" TEXT,
    "context_id" UUID,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ,

    CONSTRAINT "agent_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "article_analyses_article_id_key" ON "article_analyses"("article_id");

-- CreateIndex
CREATE INDEX "agent_runs_run_type_idx" ON "agent_runs"("run_type");

-- CreateIndex
CREATE INDEX "agent_runs_started_at_idx" ON "agent_runs"("started_at" DESC);

-- CreateIndex
CREATE INDEX "agent_runs_context_id_idx" ON "agent_runs"("context_id");

-- AddForeignKey
ALTER TABLE "article_analyses" ADD CONSTRAINT "article_analyses_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
