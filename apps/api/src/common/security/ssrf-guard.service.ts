import { Injectable, BadRequestException } from '@nestjs/common';
import * as net from 'net';

@Injectable()
export class SsrfGuardService {
  /**
   * Validates a URL to prevent Server-Side Request Forgery (SSRF).
   * Ensures the URL uses HTTP/HTTPS and resolves to a public IP address space.
   *
   * @param rawUrl The URL string to validate.
   * @throws BadRequestException if the URL is invalid or unsafe.
   */
  public assertSafeUrl(rawUrl: string): void {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(rawUrl);
    } catch {
      throw new BadRequestException('Invalid URL format');
    }

    // 1. Check Protocol (must be http or https)
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      throw new BadRequestException(
        'Only HTTP and HTTPS protocols are allowed',
      );
    }

    const hostname = parsedUrl.hostname;
    const cleanHostname = hostname.replace(/^\[(.*)\]$/, '$1');

    // 2. Check for local/internal hostnames
    const forbiddenHostnames = ['localhost', 'broadcasthost'];
    if (forbiddenHostnames.includes(cleanHostname.toLowerCase())) {
      throw new BadRequestException('Local hostnames are not allowed');
    }

    // 3. If it's an IP address, ensure it's not a private/reserved/internal IP
    if (net.isIPv4(cleanHostname)) {
      if (this.isPrivateIPv4(cleanHostname)) {
        throw new BadRequestException(
          'Internal or reserved IP addresses are not allowed',
        );
      }
    } else if (net.isIPv6(cleanHostname)) {
      if (this.isPrivateIPv6(cleanHostname)) {
        throw new BadRequestException(
          'Internal or reserved IP addresses are not allowed',
        );
      }
    }

    // Note: To be fully secure against DNS rebinding and advanced SSRF,
    // we would actually need to resolve the hostname to an IP and check it here,
    // or use an outbound proxy that enforces these rules.
    // For this MVP, we perform basic string matching on the provided hostname/IP.
  }

  private isPrivateIPv4(ip: string): boolean {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4) return false;

    // 0.x.x.x
    if (parts[0] === 0) return true;
    // 10.x.x.x (Private)
    if (parts[0] === 10) return true;
    // 127.x.x.x (Loopback)
    if (parts[0] === 127) return true;
    // 169.254.x.x (Link-local)
    if (parts[0] === 169 && parts[1] === 254) return true;
    // 172.16.x.x to 172.31.x.x (Private)
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    // 192.168.x.x (Private)
    if (parts[0] === 192 && parts[1] === 168) return true;
    // 224.x.x.x to 239.x.x.x (Multicast)
    if (parts[0] >= 224 && parts[0] <= 239) return true;
    // 255.255.255.255 (Broadcast)
    if (ip === '255.255.255.255') return true;

    return false;
  }

  private isPrivateIPv6(ip: string): boolean {
    const lowercaseIp = ip.toLowerCase();
    // Loopback
    if (lowercaseIp === '::1') return true;
    // Unspecified
    if (lowercaseIp === '::') return true;
    // Unique local address (fc00::/7)
    if (lowercaseIp.startsWith('fc') || lowercaseIp.startsWith('fd'))
      return true;
    // Link-local address (fe80::/10)
    if (
      lowercaseIp.startsWith('fe8') ||
      lowercaseIp.startsWith('fe9') ||
      lowercaseIp.startsWith('fea') ||
      lowercaseIp.startsWith('feb')
    )
      return true;
    // Multicast (ff00::/8)
    if (lowercaseIp.startsWith('ff')) return true;

    // IPv4-mapped IPv6 address checking
    if (lowercaseIp.startsWith('::ffff:')) {
      const ipv4 = lowercaseIp.substring(7);
      if (net.isIPv4(ipv4)) {
        return this.isPrivateIPv4(ipv4);
      }
    }

    return false;
  }
}
