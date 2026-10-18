import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BufferPublisherService {
  private readonly logger = new Logger(BufferPublisherService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Publishes content immediately to the configured LinkedIn Company Page via Buffer.
   * Returns the Buffer update URL, or null if the URL couldn't be determined.
   */
  async publishToLinkedInCompanyPage(content: string): Promise<string | null> {
    const accessToken = this.configService.get<string>('BUFFER_ACCESS_TOKEN');
    const profileId = this.configService.get<string>(
      'BUFFER_LINKEDIN_PROFILE_ID',
    );

    if (!accessToken || !profileId) {
      throw new Error(
        'Buffer is not configured. Set BUFFER_ACCESS_TOKEN and BUFFER_LINKEDIN_PROFILE_ID in Render environment variables.',
      );
    }

    this.logger.log(
      `Publishing to LinkedIn Company Page via Buffer (profile: ${profileId})...`,
    );

    const params = new URLSearchParams();
    params.append('access_token', accessToken);
    params.append('profile_ids[]', profileId);
    params.append('text', content);
    params.append('now', 'true'); // publish immediately, don't queue inside Buffer

    const response = await fetch(
      'https://api.bufferapp.com/1/updates/create.json',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params,
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Buffer API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const postId = data?.updates?.[0]?.id;

    this.logger.log(`Buffer published successfully. Update ID: ${postId}`);
    return postId ? `https://buffer.com/updates/${postId}` : null;
  }

  /**
   * Returns true if Buffer credentials are present in env vars.
   */
  isConfigured(): boolean {
    return !!(
      this.configService.get('BUFFER_ACCESS_TOKEN') &&
      this.configService.get('BUFFER_LINKEDIN_PROFILE_ID')
    );
  }
}
