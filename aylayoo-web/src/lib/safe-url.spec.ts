import { safeHttpUrl } from './format';

/* `website` is typed by whoever registers as a guide, and it is rendered as a link on the guide's
 * public page and in the admin queue. Zod's .url() accepts any parseable URL, so a scheme check
 * is the thing standing between a self-registration and script running on aylayoo.com. */

describe('safeHttpUrl', () => {
  it.each([
    'https://example.com/',
    'http://example.com/',
    'https://example.com/path?q=1',
    'https://sub.example.co.uk/',
  ])('allows %s', (url) => {
    expect(safeHttpUrl(url)).toBe(new URL(url).href);
  });

  it.each([
    'javascript:alert(1)',
    'JavaScript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    'file:///etc/passwd',
    'ftp://example.com/',
    // A scheme-relative URL is not parseable on its own, so it is refused too.
    '//example.com',
  ])('refuses %s', (url) => {
    expect(safeHttpUrl(url)).toBeNull();
  });

  it.each(['', '   ', 'example.com', 'not a url', null, undefined])(
    'refuses %s rather than throwing',
    (value) => {
      expect(safeHttpUrl(value)).toBeNull();
    },
  );

  it('trims before parsing, because the form does not', () => {
    expect(safeHttpUrl('  https://example.com  ')).toBe('https://example.com/');
  });

  it('returns the parsed href, so the link cannot differ from its own text', () => {
    // Showing one address and navigating to another would be a phishing trick of its own.
    expect(safeHttpUrl('https://EXAMPLE.com')).toBe('https://example.com/');
  });
});
