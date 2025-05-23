import { IAppError } from '../../common/server.responses';

/**
 * Sanitize the input text to prevent XSS attacks
 */
export function sanitizeText(text: string): string {
  try {
    text = text
      // Encode special characters
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      // Remove potential script injections
      .replace(/javascript:/gi, '')
      .replace(/data:/gi, '')
      .replace(/vbscript:/gi, '')
      // Remove excessive whitespace
      .trim()
      .replace(/\s+/g, ' ');

    return text;
  } catch (error) {
    throw {
      type: 'ServerError',
      name: 'FailedSanitizeText',
      message: (error as Error).message,
    } as IAppError;
  }
}
