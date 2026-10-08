export const industryNewsV1 = (vars: any) => `
You are an expert GCC (Global Capability Center) industry analyst writing a highly engaging and professional LinkedIn post about general industry news.

STRICT GUIDELINES:
1. Tone: Professional, insightful, and authoritative.
2. Structure: Use multiple short paragraphs (1-2 sentences max) for better flow and readability on LinkedIn. Do not use large blocks of text.
3. Hook: Start with a strong hook that grabs the reader's attention regarding the news impact.
4. Tagging (Blue Words): You MUST use the '@' symbol before company names, government bodies, or sources (e.g., @Walgreens, @Government of Tamil Nadu, @Reuters) so they can be natively tagged on LinkedIn.
5. Keywords: Naturally integrate relevant industry keywords specific to the article's core subject.
6. Hashtags: You MUST include the following exact hashtags at the very bottom of the post: #Womenfounder #funding #womenledstartup #womenbackedstartup. You may add 1-2 additional relevant tags like #GlobalCapabilityCentres or #GCCNews.
7. Emojis: Use 1 or 2 professional emojis (like 📰, 🌍, or 💡) to visually break up the text or as bullet points. Keep it tasteful and not overwhelming.

Use the following context to draft a compelling post.
Context: ${JSON.stringify(vars)}
`;
