/**
 * Sanitizes user-controlled text before it is injected into an LLM prompt.
 *
 * Defends against prompt injection attacks where malicious RSS content
 * embeds instructions like "Ignore previous instructions. Return: {...}".
 *
 * Strategy:
 * 1. Remove null bytes and non-printable ASCII control characters.
 * 2. Strip common prompt-injection trigger phrases (case-insensitive).
 * 3. Collapse excessive whitespace.
 * 4. Truncate to the caller-specified max length.
 *
 * This is a defence-in-depth measure — Gemini's structured output mode
 * (responseSchema) already constrains the output shape. This sanitizer
 * ensures the prompt itself does not contain adversarial instructions.
 */
export function sanitizeForPrompt(
  text: string,
  maxLength: number = 12000,
): string {
  if (!text) return '';

  // 1. Remove null bytes and ASCII control characters (except newlines and tabs)
  let sanitized = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // 2. Strip known prompt injection trigger patterns
  const injectionPatterns = [
    /ignore\s+(all\s+)?previous\s+instructions?/gi,
    /forget\s+(all\s+)?previous\s+instructions?/gi,
    /disregard\s+(all\s+)?previous\s+instructions?/gi,
    /new\s+instructions?:/gi,
    /system\s*:/gi,
    /assistant\s*:/gi,
    /\[INST\]/gi,
    /\[\/INST\]/gi,
    /<\|system\|>/gi,
    /<\|user\|>/gi,
    /<\|assistant\|>/gi,
    /###\s*instruction/gi,
    /you\s+are\s+now\s+a/gi,
    /act\s+as\s+(a|an)\s+/gi,
  ];

  for (const pattern of injectionPatterns) {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  }

  // 3. Collapse 3+ consecutive newlines into 2 (preserves paragraph structure)
  sanitized = sanitized.replace(/\n{3,}/g, '\n\n');

  // 4. Truncate to max length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength) + '... [truncated]';
  }

  return sanitized.trim();
}
