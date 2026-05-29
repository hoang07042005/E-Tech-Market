import { sanitizeHtml } from '../../utils/sanitizeHtml.ts';
import DOMPurify from 'dompurify';


// Mock DOMPurify to test if it's called with the correct parameters
vi.mock('dompurify', () => ({
  default: {
    sanitize: vi.fn((html: string) => `sanitized-${html}`),
  },
}));

describe('sanitizeHtml utility function', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return empty string if html is null', () => {
    expect(sanitizeHtml(null)).toBe('');
  });

  it('should return empty string if html is undefined', () => {
    expect(sanitizeHtml(undefined)).toBe('');
  });

  it('should return empty string if html is empty string', () => {
    expect(sanitizeHtml('')).toBe('');
  });

  it('should call DOMPurify.sanitize with correct arguments', () => {
    const inputHtml = '<a href="test" target="_blank" onclick="alert(1)">Link</a>';
    const result = sanitizeHtml(inputHtml);

    expect(DOMPurify.sanitize).toHaveBeenCalledWith(inputHtml, {
      USE_PROFILES: { html: true },
      ADD_ATTR: ['target', 'rel'],
    });

    expect(result).toBe(`sanitized-${inputHtml}`);
  });
});
