import { ERROR_CODES } from 'src/common/errors/error-codes';

describe('ERROR_CODES registry', () => {
  const entries = Object.values(ERROR_CODES);

  it('should have unique codes', () => {
    const codes = entries.map((e) => e.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('should have codes matching domain.error_name format', () => {
    for (const entry of entries) {
expect(entry.code).toMatch(/^[a-z_]+\.[a-z_]+$/);
    }
  });

  it('should have valid HTTP status codes', () => {
    for (const entry of entries) {
      expect(entry.httpStatus).toBeGreaterThanOrEqual(400);
      expect(entry.httpStatus).toBeLessThan(600);
    }
  });

  it('should have non-empty messages', () => {
    for (const entry of entries) {
      expect(entry.message.length).toBeGreaterThan(0);
    }
  });
});
