/**
 * What Community Scout accepts for each upload role, in place of the limits
 * Kleros's Atlas service sets. The app checks files before sending them, and
 * the upload API enforces the same limits.
 */
export const UPLOAD_ROLES: Record<
  string,
  { maxSize: number; allowedMimeTypes: string[] }
> = {
  // Files attached to evidence.
  evidence: {
    maxSize: 5 * 1024 * 1024,
    allowedMimeTypes: [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/webp',
      'image/gif',
      'text/plain',
    ],
  },
  // The JSON of items, evidence and meta-evidence.
  'curate-item-file': {
    maxSize: 1024 * 1024,
    allowedMimeTypes: ['application/json'],
  },
  // Images inside items, such as a contract domain's visual proof.
  'curate-item-image': {
    maxSize: 4 * 1024 * 1024,
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
  },
  // Token logos: PNG, at most 1 MB under the Tokens policy.
  logo: { maxSize: 1024 * 1024, allowedMimeTypes: ['image/png'] },
}

/** The largest request the upload API reads: the biggest file plus form overhead. */
export const MAX_UPLOAD_REQUEST_BYTES = 5 * 1024 * 1024 + 64 * 1024
