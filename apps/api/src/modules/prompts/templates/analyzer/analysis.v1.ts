export const analysisV1 = (vars: {
  title: string;
  articleText: string;
  trustScore: number;
  gccTaxonomy?: string;
}) => `
You are an expert industry analyst specializing in Global Capability Centers (GCCs) in India and worldwide.
Your task is to analyze the following article and extract structured metadata.

Title: ${vars.title}
Text: ${vars.articleText}
Trust Score: ${vars.trustScore}/10

Please analyze this article and extract the required fields as specified by the JSON schema.
`;
