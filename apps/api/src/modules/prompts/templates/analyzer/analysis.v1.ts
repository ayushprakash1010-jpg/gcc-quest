export const analysisV1 = (vars: {
  title: string;
  articleText: string;
  trustScore: number;
  gccTaxonomy?: string;
}) => `
You are an expert industry analyst specializing in Global Capability Centers (GCCs) in India and worldwide.
Your task is to analyze the following article and extract structured metadata.

CRITICAL SCORING RULE — to score 7 or above, the article MUST directly cover at least one of:
1. Global Capability Centers (GCCs) in India: expansion, new setups, city growth, real estate/leasing, workforce, reskilling, leadership.
2. Enterprise AI or technology transformation WITHIN a GCC or large multinational India context (not generic AI product news).
3. GCC-sector or deep-tech startup funding with clear relevance to the India enterprise/GCC ecosystem (e.g. a company that serves GCCs, or whose funding was led by a GCC-affiliated entity).
4. Women leaders, founders, or diversity initiatives specifically in India's GCC, enterprise tech, or B2B ecosystem.
5. India government policy, SEZ regulation, or economic data that directly impacts GCC operations.

MUST score 4 or below (these are NOT GCC-relevant):
- Consumer startup funding (D2C brands, edtech, gaming, food delivery, retail) with no GCC connection.
- Generic global AI product launches or releases without explicit India GCC context.
- General stock market, mutual fund, IPO, or retail investment news.
- Lifestyle, entertainment, or celebrity news.

Title: ${vars.title}
Text: ${vars.articleText}
Trust Score: ${vars.trustScore}/10

Please analyze this article and extract the required fields as specified by the JSON schema.
For the "summary" field, write a rich, substantive 2 to 3 paragraph breakdown (separated by double newlines) explaining:
1. The core event, key companies involved, location, and specific numbers (headcount, investment, timeline).
2. The strategic context and why this matters to enterprise operations.
3. The broader implications for India's GCC ecosystem.

For the "headline" field, provide a punchy 2-part graphic headline for social imagery:
- "h1": 1-3 word subject (e.g., "Hyderabad", "Starbucks", "AI is", "German companies")
- "h2": 2-4 word action/milestone (e.g., "on a growth trajectory.", "expands in Chennai.", "reshaping GCC jobs.", "expanding in India.")
`;
