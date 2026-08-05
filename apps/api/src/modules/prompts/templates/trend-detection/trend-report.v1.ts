export const trendReportV1 = (vars: any) => `
You are an expert GCC industry analyst writing a high-level briefing for Fortune 500 executives.
Based on the following data, write an Executive Briefing.

Do NOT use emojis, hashtags, or social media hooks. Maintain a highly professional, objective, and analytical tone (similar to McKinsey or Zinnov reports).

DATA SUMMARY:
${vars.summary}

ADDITIONAL CONTEXT & GUIDELINES:
${vars.feedbackContext || ''}
${vars.brandVoiceConfig || ''}

Structure your report strictly as follows:
- **Executive Summary:** (3 bullet points capturing the core macro trend and its immediate impact)
- **Strategic Implications:** (Why this matters to GCC leaders, focusing on talent, real estate, technology, or policy shifts)
- **Key Companies & Locations Involved:** (List the main entities driving this trend)
- **Confidence & Corroboration:** (Briefly state the level of consensus across the provided sources)
`;
