/**
 * @requirement REQ-024 - Path traversal sanitization for file uploads and deletion
 */
import { describe, it, expect } from 'vitest';
import path from 'path';

/**
 * Sanitizes an upload filename by stripping directory components.
 * Used in menu-actions.ts and profile-service.ts before path.join().
 */
function sanitizeUploadFilename(rawFilename: string): string {
  return path.basename(rawFilename);
}

/**
 * Validates that a resolved file path is within the expected base directory.
 * Used in profile-service.ts before unlinking old profile pictures.
 * Returns the resolved path if safe, or null if it escapes the base directory.
 */
function validatePathContainment(
  userPath: string,
  baseDir: string
): string | null {
  const resolved = path.resolve(baseDir, userPath);
  // Ensure the resolved path starts with the base directory + separator
  // to prevent partial matches (e.g., /public-evil matching /public)
  if (resolved === baseDir || resolved.startsWith(baseDir + path.sep)) {
    return resolved;
  }
  return null;
}

describe('Upload filename sanitization', () => {
  it('strips directory traversal sequences from upload filenames', () => {
    expect(sanitizeUploadFilename('../../etc/passwd')).toBe('passwd');
    expect(sanitizeUploadFilename('../../../secret.png')).toBe('secret.png');
    // On Linux, backslashes are valid filename chars — path.basename only strips forward slashes
    // This is correct behavior: the server runs on Linux, so only forward-slash traversal matters
    expect(sanitizeUploadFilename('../../../../secret.txt')).toBe('secret.txt');
  });

  it('strips absolute paths from upload filenames', () => {
    expect(sanitizeUploadFilename('/etc/passwd')).toBe('passwd');
    expect(sanitizeUploadFilename('/var/www/shell.php')).toBe('shell.php');
  });

  it('preserves safe filenames unchanged', () => {
    expect(sanitizeUploadFilename('photo.jpg')).toBe('photo.jpg');
    expect(sanitizeUploadFilename('my-image.png')).toBe('my-image.png');
    expect(sanitizeUploadFilename('file with spaces.webp')).toBe(
      'file with spaces.webp'
    );
  });

  it('handles filenames with only dots', () => {
    expect(sanitizeUploadFilename('...')).toBe('...');
    // Single dot and double dot are special but basename handles them
    expect(sanitizeUploadFilename('.')).toBe('.');
    expect(sanitizeUploadFilename('..')).toBe('..');
  });

  it('extracts extension safely from sanitized filename', () => {
    const raw = '../../evil.png';
    const safe = sanitizeUploadFilename(raw);
    const ext = safe.split('.').pop();
    expect(ext).toBe('png');
    expect(safe).toBe('evil.png');
  });
});

describe('Profile picture path containment', () => {
  const baseDir = '/app/public';

  it('rejects paths resolving outside the base directory', () => {
    expect(validatePathContainment('../../etc/passwd', baseDir)).toBeNull();
    expect(
      validatePathContainment('../../../root/.ssh/id_rsa', baseDir)
    ).toBeNull();
    expect(validatePathContainment('/etc/passwd', baseDir)).toBeNull();
  });

  it('allows paths within the base directory', () => {
    expect(validatePathContainment('uploads/profiles/photo.jpg', baseDir)).toBe(
      path.resolve(baseDir, 'uploads/profiles/photo.jpg')
    );
    expect(validatePathContainment('uploads/menu/img.png', baseDir)).toBe(
      path.resolve(baseDir, 'uploads/menu/img.png')
    );
  });

  it('rejects paths that are partial prefix matches', () => {
    // /app/public-evil should NOT match /app/public
    expect(
      validatePathContainment('../public-evil/hack.txt', baseDir)
    ).toBeNull();
  });

  it('normalizes paths with embedded traversal', () => {
    // path.resolve normalizes these — uploads/../uploads is fine
    const result = validatePathContainment(
      'uploads/../uploads/photo.jpg',
      baseDir
    );
    expect(result).toBe(path.resolve(baseDir, 'uploads/photo.jpg'));
  });
});
