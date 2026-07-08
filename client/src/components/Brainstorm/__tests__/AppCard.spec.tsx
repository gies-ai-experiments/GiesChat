import { render, screen } from 'test/layout-test-utils';
import type { TRoomMessage } from 'librechat-data-provider';
import AppCard from '../AppCard';

const make = (appUrl?: string): TRoomMessage => ({
  roomId: 'r',
  messageId: 'm',
  authorId: 'u',
  authorName: 'Ash',
  kind: 'app',
  text: 'The app is live',
  appUrl,
});

describe('AppCard', () => {
  it('renders a sandboxed iframe for an allowed url', () => {
    render(<AppCard message={make('https://x.replit.dev/')} />);
    const frame = screen.getByTitle(/app preview/i) as HTMLIFrameElement;
    expect(frame.getAttribute('src')).toBe('https://x.replit.dev/');
    expect(frame.getAttribute('sandbox')).toContain('allow-scripts');
  });

  it('renders nothing for a disallowed url', () => {
    const { container } = render(<AppCard message={make('https://evil.com/')} />);
    expect(container.querySelector('iframe')).toBeNull();
  });
});
