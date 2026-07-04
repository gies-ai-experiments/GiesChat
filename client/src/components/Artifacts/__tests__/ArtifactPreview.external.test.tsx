import { render, screen } from '@testing-library/react';
import type { MutableRefObject } from 'react';
import type { SandpackPreviewRef } from '@codesandbox/sandpack-react/unstyled';
import { EXTERNAL_URL_FILE_KEY } from '~/utils/artifacts';
import { ArtifactPreview } from '../ArtifactPreview';

const previewRef = { current: null } as unknown as MutableRefObject<SandpackPreviewRef>;

const renderExternal = (url: string) =>
  render(
    <ArtifactPreview
      files={{ [EXTERNAL_URL_FILE_KEY]: url }}
      fileKey={EXTERNAL_URL_FILE_KEY}
      template="static"
      sharedProps={{}}
      previewRef={previewRef}
    />,
  );

describe('ArtifactPreview external-url branch', () => {
  it('renders a sandboxed iframe with an open-in-new-tab link for allowed URLs', () => {
    renderExternal('https://my-app.replit.app');
    const iframe = screen.getByTitle(/live app preview/i);
    expect(iframe).toHaveAttribute('src', 'https://my-app.replit.app/');
    expect(iframe).toHaveAttribute(
      'sandbox',
      'allow-scripts allow-same-origin allow-forms allow-popups allow-downloads',
    );
    const link = screen.getByRole('link', { name: /open in new tab/i });
    expect(link).toHaveAttribute('href', 'https://my-app.replit.app/');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('renders nothing for disallowed URLs', () => {
    const { container } = renderExternal('https://evil.com');
    expect(container).toBeEmptyDOMElement();
  });
});
