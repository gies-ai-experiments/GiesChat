import React, { memo, useMemo, useState, useEffect, type MutableRefObject } from 'react';
import { Spinner } from '@librechat/client';
import { SandpackPreview, SandpackProvider } from '@codesandbox/sandpack-react/unstyled';
import type {
  SandpackProviderProps,
  SandpackPreviewRef,
} from '@codesandbox/sandpack-react/unstyled';
import type { SandpackStartupConfig } from '~/utils/artifacts';
import type { ArtifactFiles } from '~/common';
import { useReplitBuildStatus } from '~/data-provider';
import { useLocalize } from '~/hooks';
import {
  sharedFiles,
  buildSandpackOptions,
  EXTERNAL_URL_FILE_KEY,
  REPLIT_BUILD_FILE_KEY,
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

const REPL_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{5,63}$/;
const MAX_POLL_MS = 12 * 60_000;

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function ReplitBuildPreview({ content }: { content?: string }) {
  const localize = useLocalize();
  const [startedAt] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  const replId = (content ?? '').trim();
  const validId = REPL_ID_RE.test(replId);
  const data = useReplitBuildStatus(validId ? replId : '', startedAt);
  const ready = data?.status === 'ready' && data.url != null;

  useEffect(() => {
    if (ready) {
      return;
    }
    const timer = setInterval(() => setElapsed(Date.now() - startedAt), 1000);
    return () => clearInterval(timer);
  }, [ready, startedAt]);

  if (!validId) {
    return null;
  }

  if (ready) {
    return <ExternalUrlPreview content={data.url} />;
  }

  const showFallback = elapsed > MAX_POLL_MS || data?.status === 'error';
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center">
      <Spinner className="size-8 text-text-primary" />
      <p className="text-sm font-semibold text-text-primary">
        {localize('com_ui_replit_building_title')}
      </p>
      <p className="max-w-[36ch] text-sm text-text-secondary">
        {showFallback
          ? localize('com_ui_replit_building_slow')
          : localize('com_ui_replit_building_desc')}
      </p>
      <p className="text-xs text-text-secondary">{formatElapsed(elapsed)}</p>
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

  if (fileKey === REPLIT_BUILD_FILE_KEY) {
    return <ReplitBuildPreview content={files[REPLIT_BUILD_FILE_KEY]} />;
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
