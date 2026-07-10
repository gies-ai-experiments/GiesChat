FROM node:20-slim

ENV NODE_ENV=production
ENV PORT=8080
ENV MS365_MCP_ORG_MODE=true
ENV READ_ONLY=true
ENV MS365_MCP_OUTPUT_FORMAT=toon
ENV MS365_MCP_REDACT_PII=true
ENV MS365_MCP_MAX_TOP=15
ENV MS365_MCP_MAX_PAGES=3
ENV MS365_MCP_MAX_ITEMS=100

RUN npm install -g @softeria/ms-365-mcp-server@0.129.1

EXPOSE 8080

CMD ["sh", "-c", "ms-365-mcp-server --http ${PORT} --org-mode --preset outlook --read-only --toon --public-url ${PUBLIC_URL}"]
