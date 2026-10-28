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

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ||
      'https://gcc-quest-web.vercel.app';
    let cleanImageUrl =
      imageUrl && imageUrl.trim().length > 0
        ? imageUrl.trim()
        : `${frontendUrl}/api/og?title=GCC+Quest+Insights&source=GCC+Quest`;

    // Ensure no Google WebP -rw parameters reach the webhook
    if (cleanImageUrl.includes('-rw')) {
      cleanImageUrl = cleanImageUrl.replace(/-rw/g, '');
    }

    // Fix double-encoded mojibake from curly quotes / non-ASCII filenames
    // %C2%80%99 is the mojibake representation of UTF-8 right curly quote (%E2%80%99)
    if (cleanImageUrl.includes('%C2%80%99')) {
      cleanImageUrl = cleanImageUrl.replace(/%C2%80%99/g, '%E2%80%99');
    }
    if (cleanImageUrl.includes('%C2%80%98')) {
      cleanImageUrl = cleanImageUrl.replace(/%C2%80%98/g, '%E2%80%98');
    }
    if (cleanImageUrl.includes('%C2%80%9C')) {
      cleanImageUrl = cleanImageUrl.replace(/%C2%80%9C/g, '%E2%80%9C');
    }
    if (cleanImageUrl.includes('%C2%80%9D')) {
      cleanImageUrl = cleanImageUrl.replace(/%C2%80%9D/g, '%E2%80%9D');
    }

    // Wrap external/blob URLs with our frontend proxy route so Make.com & LinkedIn
    // always receive a clean, standard endpoint that streams binary image data directly.
    let finalWebhookImageUrl = cleanImageUrl;
    if (
      !cleanImageUrl.startsWith(`${frontendUrl}/api/og`) &&
      !cleanImageUrl.startsWith(`${frontendUrl}/api/proxy-image`)
    ) {
      finalWebhookImageUrl = `${frontendUrl}/api/proxy-image?url=${encodeURIComponent(cleanImageUrl)}`;
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content,
        imageUrl: finalWebhookImageUrl,
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
