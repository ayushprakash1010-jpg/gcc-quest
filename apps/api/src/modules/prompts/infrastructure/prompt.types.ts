export interface PromptVersion {
  version: string;
  render: (vars: any) => string;
}

export interface PromptTemplate {
  key: string;
  description: string;
  versions: PromptVersion[];
}
