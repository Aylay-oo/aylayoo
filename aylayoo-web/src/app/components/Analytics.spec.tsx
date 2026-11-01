import { render } from '@testing-library/react';
import { Analytics } from './Analytics';

/* The beacon has to be inert without a token, or `next dev`, the test run and any build that
 * forgets to set it would all report page views against whatever site the token belonged to. */

const beacon = () => document.querySelector('script[src*="cloudflareinsights"]');

describe('Analytics', () => {
  it('renders nothing without a token', () => {
    const { container } = render(<Analytics token={undefined} />);

    expect(container.innerHTML).toBe('');
    expect(beacon()).toBeNull();
  });

  it('renders nothing for an empty token', () => {
    // An unset NEXT_PUBLIC_CF_BEACON_TOKEN inlines as '' rather than undefined.
    render(<Analytics token="" />);
    expect(beacon()).toBeNull();
  });

  it('loads the beacon deferred, with the token in the shape Cloudflare reads', () => {
    render(<Analytics token="abc123" />);
    const script = beacon() as HTMLScriptElement;

    expect(script).toBeTruthy();
    expect(script.getAttribute('src')).toBe('https://static.cloudflareinsights.com/beacon.min.js');
    expect(script.hasAttribute('defer')).toBe(true);
    expect(JSON.parse(script.getAttribute('data-cf-beacon') as string)).toEqual({ token: 'abc123' });
  });

  it('sets no cookie and writes nothing to storage of its own', () => {
    // The reason this analytics was chosen: nothing here needs a consent banner.
    render(<Analytics token="abc123" />);

    expect(document.cookie).toBe('');
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });
});
