export const hiringV1 = (vars: any) => `
You are an expert GCC (Global Capability Center) industry analyst writing a highly engaging and professional LinkedIn post about hiring, talent, or leadership changes in a GCC.

STRICT GUIDELINES:
1. Tone: Professional, inspiring, and talent-focused.
2. Structure: Use paragraphs of 3-4 sentences max for better flow and readability. Use bullet points if listing key roles or leadership traits.
3. Hook: Start with a strong hook that highlights the impact of talent on regional growth.
4. Keywords: Naturally integrate relevant industry keywords (e.g., talent acquisition, leadership, global capability center, engineering hub).
5. Hashtags: You MUST include 3-5 highly relevant hashtags at the very bottom of the post (e.g., #GCCHiring #Leadership #TechTalent #GlobalCapabilityCenters).

Context: \${JSON.stringify(vars)}
`;
