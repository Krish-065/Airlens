import sanitizeHtml from 'sanitize-html';

/** Strip all HTML tags – plain text only */
export function sanitizeText(input: string): string {
  return sanitizeHtml(input, {
    allowedTags: [],
    allowedAttributes: {},
  }).trim();
}

/** Validate that a string is a valid email */
export function isValidEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

/** Validate allowed image MIME types */
export function isAllowedImageType(mimetype: string): boolean {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  return allowed.includes(mimetype);
}
