import { Constants, getAllowedExternalUrl } from 'librechat-data-provider';
import type { Artifact } from '~/common';
import { TOOL_ARTIFACT_TYPES } from '~/utils/artifacts';

export type ReplitBuildStatus = 'building' | 'ready';

export type ReplitBuildEvent = {
  status: ReplitBuildStatus;
  replId?: string;
  title?: string;
  previewUrl?: string;
};

const REPLIT_TOOL_NAMES = new Set([
  'create_app_from_prompt',
  'ask_question',
  'update_app_using_prompt',
]);

const REPLIT_PREVIEW_URL_PATTERN =
  /https:\/\/[^\s"'<>`]+(?:replit\.dev|replit\.app|repl\.co)[^\s"'<>`]*/gi;

function parseMaybeJson(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function collectStrings(value: unknown, result: string[] = []): string[] {
  if (typeof value === 'string') {
    result.push(value);
    return result;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectStrings(item, result);
    }
    return result;
  }
  if (value && typeof value === 'object') {
    for (const nested of Object.values(value as Record<string, unknown>)) {
      collectStrings(nested, result);
    }
  }
  return result;
}

function firstStringField(value: unknown, fieldNames: string[]): string | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  for (const fieldName of fieldNames) {
    const field = record[fieldName];
    if (typeof field === 'string' && field.trim()) {
      return field.trim();
    }
  }
  return undefined;
}

function getBaseToolName(toolName: string): string | undefined {
  const suffix = `${Constants.mcp_delimiter}replit`;
  if (!toolName.endsWith(suffix)) {
    return REPLIT_TOOL_NAMES.has(toolName) ? toolName : undefined;
  }
  return toolName.slice(0, -suffix.length);
}

export function isReplitToolCallName(toolName?: string): boolean {
  if (!toolName) {
    return false;
  }
  const baseName = getBaseToolName(toolName);
  return baseName != null && REPLIT_TOOL_NAMES.has(baseName);
}

export function getReplitPreviewUrl(output: unknown): string | undefined {
  const parsed = parseMaybeJson(output);
  const strings = collectStrings(parsed);
  for (const text of strings) {
    for (const match of text.matchAll(REPLIT_PREVIEW_URL_PATTERN)) {
      const url = getAllowedExternalUrl(match[0]);
      if (url) {
        return url;
      }
    }
  }
  return undefined;
}

export function getReplitBuildEvent(toolCall?: {
  name?: string;
  args?: unknown;
  output?: unknown;
}): ReplitBuildEvent | undefined {
  if (!isReplitToolCallName(toolCall?.name)) {
    return undefined;
  }

  const args = parseMaybeJson(toolCall?.args);
  const output = parseMaybeJson(toolCall?.output);
  const replId =
    firstStringField(output, ['replId', 'repl_id', 'id']) ??
    firstStringField(args, ['replId', 'repl_id']);
  const title =
    firstStringField(args, ['appName', 'name', 'title']) ??
    firstStringField(output, ['appName', 'name', 'title']) ??
    'Replit app';
  const previewUrl = getReplitPreviewUrl(output);

  if (previewUrl) {
    return {
      status: 'ready',
      replId,
      title,
      previewUrl,
    };
  }

  const baseName = toolCall?.name ? getBaseToolName(toolCall.name) : undefined;
  if (baseName === 'create_app_from_prompt' || baseName === 'update_app_using_prompt') {
    return {
      status: 'building',
      replId,
      title,
    };
  }

  return undefined;
}

export function createReplitExternalUrlArtifact(event: ReplitBuildEvent): Artifact | undefined {
  if (event.status !== 'ready' || !event.previewUrl) {
    return undefined;
  }
  const idSeed = event.replId || event.previewUrl;
  const id = `replit-app-${idSeed.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
  return {
    id,
    identifier: 'replit-app',
    title: event.title || 'Replit app',
    type: TOOL_ARTIFACT_TYPES.EXTERNAL_URL,
    content: event.previewUrl,
    lastUpdateTime: Date.now(),
  };
}
