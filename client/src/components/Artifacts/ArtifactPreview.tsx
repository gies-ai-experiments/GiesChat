import React, { memo, useMemo, type MutableRefObject } from 'react';
import { SandpackPreview, SandpackProvider } from '@codesandbox/sandpack-react/unstyled';
import type {
  SandpackProviderProps,
  SandpackPreviewRef,
} from '@codesandbox/sandpack-react/unstyled';
import type { SandpackStartupConfig } from '~/utils/artifacts';
import type { ArtifactFiles } from '~/common';
import { useLocalize } from '~/hooks';
import {
  sharedFiles,
  buildSandpackOptions,
  EXTERNAL_URL_FILE_KEY,
  getAllowedExternalUrl,
} from '~/utils/artifacts';

function ExternalUrlPreview({ content }: { content?: string }) {
  const localize = useLocalize();
  const url = getAllowedExternalUrl(content);
  if (url == null) {
    return null;
  }
  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex items-center justify-end border-b border-border-light bg-surface-primary-alt px-3 py-1.5">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-text-secondary underline"
        >
          {localize('com_ui_open_in_new_tab')}
        </a>
      </div>
      <iframe
        src={url}
        title={localize('com_ui_live_app_preview')}
        className="h-full w-full flex-grow border-0"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads"
      />
    </div>
  );
}

export const ArtifactPreview = memo(function ({
  files,
  fileKey,
  template,
  sharedProps,
  previewRef,
  currentCode,
  startupConfig,
}: {
  files: ArtifactFiles;
  fileKey: string;
  template: SandpackProviderProps['template'];
  sharedProps: Partial<SandpackProviderProps>;
  previewRef: MutableRefObject<SandpackPreviewRef>;
  currentCode?: string;
  startupConfig?: SandpackStartupConfig;
}) {
  const artifactFiles = useMemo(() => {
    if (Object.keys(files).length === 0) {
      return files;
    }
    const code = currentCode ?? '';
    if (!code) {
      return files;
    }
    return {
      ...files,
      [fileKey]: { code },
    };
  }, [currentCode, files, fileKey]);

  const options: SandpackProviderProps['options'] = useMemo(
    () => buildSandpackOptions(template, startupConfig),
    [startupConfig, template],
  );

  if (fileKey === EXTERNAL_URL_FILE_KEY) {
    return <ExternalUrlPreview content={files[EXTERNAL_URL_FILE_KEY]} />;
  }

  if (Object.keys(artifactFiles).length === 0) {
    return null;
  }

  return (
    <SandpackProvider
      files={{ ...artifactFiles, ...sharedFiles }}
      options={options}
      {...sharedProps}
      template={template}
    >
      <SandpackPreview
        showOpenInCodeSandbox={false}
        showRefreshButton={false}
        tabIndex={0}
        ref={previewRef}
      />
    </SandpackProvider>
  );
});
