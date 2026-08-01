import { Injectable, NotFoundException } from '@nestjs/common';
import { PROMPT_REGISTRY } from './prompt-registry';
import { PromptTemplate, PromptVersion } from './prompt.types';

@Injectable()
export class PromptService {
  // In MVP, we just use 'v1' as active always since we don't have DB persistence for active version yet.
  // We can add a simple active memory registry.
  private activeVersions: Record<string, string> = {};

  constructor() {
    // Initialize all to v1
    for (const key of Object.keys(PROMPT_REGISTRY)) {
      this.activeVersions[key] = 'v1';
    }
  }

  getActive(key: string): PromptVersion {
    const template = PROMPT_REGISTRY[key];
    if (!template) {
      throw new NotFoundException(`Prompt template ${key} not found`);
    }

    const activeVersion = this.activeVersions[key] || 'v1';
    const version = template.versions.find((v) => v.version === activeVersion);

    if (!version) {
      throw new NotFoundException(
        `Active version ${activeVersion} for prompt ${key} not found`,
      );
    }

    return version;
  }

  render(template: PromptVersion, vars: any): string {
    return template.render(vars);
  }

  getAllVersions(key: string): PromptVersion[] {
    const template = PROMPT_REGISTRY[key];
    if (!template) {
      throw new NotFoundException(`Prompt template ${key} not found`);
    }
    return template.versions;
  }

  getAllTemplates(): PromptTemplate[] {
    return Object.values(PROMPT_REGISTRY);
  }

  setActive(key: string, version: string) {
    const template = PROMPT_REGISTRY[key];
    if (!template) {
      throw new NotFoundException(`Prompt template ${key} not found`);
    }
    const exists = template.versions.find((v) => v.version === version);
    if (!exists) {
      throw new NotFoundException(
        `Version ${version} for prompt ${key} not found`,
      );
    }
    this.activeVersions[key] = version;
  }
}
