const fs = require('fs');
const { resolveHeaders } = require('@librechat/api');
const { logger } = require('@librechat/data-schemas');

const PPTX_MIMETYPE = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

/**
 * Hands a deck the user attached in the composer to the PowerPoint MCP server so it
 * can be used as the generated deck's design.
 *
 * Without this the file goes down the ordinary text-extraction path, which keeps a
 * few characters of title text and discards the binary — the design is gone before
 * anything can ask for it. The bytes deliberately travel server-to-server: a real
 * template runs to megabytes, far past anything that could be routed through the
 * model as a tool argument.
 *
 * @param {object} params
 * @param {ServerRequest} params.req
 * @param {Express.Multer.File} params.req.file
 * @returns {Promise<{ file_name: string, design_layouts: object[] } | null>} null when
 * the PowerPoint server is not configured, leaving the caller on its normal path.
 */
const registerPowerpointDesign = async ({ req }) => {
  const { file } = req;
  const server = req.config?.mcpConfig?.powerpoint;
  if (!server?.url) {
    return null;
  }

  const endpoint =
    server.url.replace(/\/mcp\/?$/, '') + `/design?name=${encodeURIComponent(file.originalname)}`;
  /** The configured headers carry `${PPTX_MCP_KEY}` and `{{LIBRECHAT_USER_ID}}`
   * placeholders, resolved the same way the MCP transport resolves them. */
  const headers = {
    'Content-Type': 'application/octet-stream',
    ...resolveHeaders({ headers: server.headers, user: req.user }),
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: fs.readFileSync(file.path),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(
      `PowerPoint design upload failed (${response.status}): ${detail.slice(0, 200)}`,
    );
  }

  const result = await response.json();
  logger.debug(
    `[registerPowerpointDesign] Registered "${result.file_name}" with ${result.design_layouts?.length ?? 0} design layout(s)`,
  );
  return result;
};

/** Whether this upload should become a deck design rather than chat content */
const isPowerpointDesignUpload = ({ req, metadata }) =>
  req.file?.mimetype === PPTX_MIMETYPE &&
  !metadata.tool_resource &&
  req.config?.mcpConfig?.powerpoint?.url != null;

module.exports = { registerPowerpointDesign, isPowerpointDesignUpload, PPTX_MIMETYPE };
