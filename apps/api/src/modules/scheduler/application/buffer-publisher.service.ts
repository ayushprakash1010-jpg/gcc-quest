import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BufferPublisherService {
  private readonly logger = new Logger(BufferPublisherService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Publishes content to the LinkedIn Company Page by POSTing to a
   * configured webhook URL (Make.com / Zapier / any automation tool).
   *
   * The webhook receives: { content, source, timestamp }
   * and is expected to post it to the LinkedIn Company Page.
   *
   * Env var required: COMPANY_PAGE_WEBHOOK_URL
   */
  async publishToLinkedInCompanyPage(
    content: string,
    imageUrl?: string,
  ): Promise<string | null> {
    const webhookUrl = this.configService.get<string>(
      'COMPANY_PAGE_WEBHOOK_URL',
    );

    if (!webhookUrl) {
      throw new Error(
        'Company Page webhook not configured. Set COMPANY_PAGE_WEBHOOK_URL in Render environment variables.',
      );
    }

    this.logger.log(
      `Publishing to LinkedIn Company Page via webhook (${webhookUrl.slice(0, 50)}...)`,
    );

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content,
        imageUrl: imageUrl || null,
        source: 'gcc-quest',
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Company Page webhook error: ${response.status} - ${errorText}`,
      );
    }

    this.logger.log(`Company Page webhook delivered successfully.`);
    return `https://www.linkedin.com/company/gcc-quest/posts/`;
  }

  /**
   * Returns true if the company page webhook URL is configured.
   */
  isConfigured(): boolean {
    return !!this.configService.get('COMPANY_PAGE_WEBHOOK_URL');
  }
}
