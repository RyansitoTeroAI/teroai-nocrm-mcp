import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { NoCrmClient, loadNoCrmConfig } from "./nocrm.js";

const port = Number(process.env.PORT ?? 3000);
const noCrm = new NoCrmClient(loadNoCrmConfig());

function createServer() {
  const server = new McpServer({
    name: "nocrm-mcp",
    version: "0.1.0"
  });

  server.registerTool(
    "check_nocrm_connection",
    {
      title: "Check noCRM connection",
      description: "Verify that the noCRM API key and subdomain are working.",
      inputSchema: {}
    },
    async () => jsonResult(await noCrm.ping())
  );

  server.registerTool(
    "list_leads",
    {
      title: "List noCRM leads",
      description: "Find recent noCRM leads, optionally filtered by status, owner, or query text.",
      inputSchema: {
        limit: z.number().int().min(1).max(100).optional(),
        offset: z.number().int().min(0).optional(),
        status: z.string().optional(),
        user_id: z.string().optional(),
        q: z.string().optional()
      }
    },
    async (input) => jsonResult(await noCrm.listLeads(input))
  );

  server.registerTool(
    "get_lead",
    {
      title: "Get noCRM lead",
      description: "Retrieve a noCRM lead by ID.",
      inputSchema: {
        id: z.number().int().positive()
      }
    },
    async ({ id }) => jsonResult(await noCrm.getLead(id))
  );

  server.registerTool(
    "create_lead",
    {
      title: "Create noCRM lead",
      description: "Create a new noCRM lead. Use only when the user has confirmed the lead should be created.",
      inputSchema: {
        title: z.string().min(1),
        description: z.string().optional(),
        user_id: z.string().optional(),
        tags: z.array(z.string()).optional(),
        client_folder_id: z.number().int().positive().optional()
      }
    },
    async (input) => jsonResult(await noCrm.createLead(input))
  );

  server.registerTool(
    "add_lead_comment",
    {
      title: "Add noCRM lead comment",
      description: "Add a factual note or outreach log comment to an existing noCRM lead.",
      inputSchema: {
        lead_id: z.number().int().positive(),
        content: z.string().min(1),
        user_id: z.string().optional(),
        activity_id: z.number().int().positive().optional()
      }
    },
    async (input) => jsonResult(await noCrm.addLeadComment(input))
  );

  return server;
}

function jsonResult(data) {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(data, null, 2)
      }
    ],
    structuredContent: data
  };
}

const app = express();
app.use(express.json({ limit: "1mb" }));
const sseTransports = new Map();

app.get("/", (_req, res) => {
  res.type("text/plain").send("noCRM MCP server is running. Use /mcp or /sse.");
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "nocrm-mcp" });
});

app.post("/mcp", async (req, res) => {
  const server = createServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined
  });

  res.on("close", () => {
    transport.close().catch(() => undefined);
    server.close().catch(() => undefined);
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown MCP server error"
      });
    }
  }
});

app.get("/sse", async (_req, res) => {
  const server = createServer();
  const transport = new SSEServerTransport("/messages", res);

  sseTransports.set(transport.sessionId, { server, transport });
  res.on("close", () => {
    sseTransports.delete(transport.sessionId);
    transport.close().catch(() => undefined);
    server.close().catch(() => undefined);
  });

  try {
    await server.connect(transport);
  } catch (error) {
    sseTransports.delete(transport.sessionId);
    if (!res.headersSent) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown SSE MCP server error"
      });
    }
  }
});

app.post("/messages", async (req, res) => {
  const sessionId = String(req.query.sessionId ?? "");
  const connection = sseTransports.get(sessionId);

  if (!connection) {
    res.status(404).json({ error: "Unknown or expired MCP SSE session" });
    return;
  }

  try {
    await connection.transport.handlePostMessage(req, res, req.body);
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown MCP message error"
      });
    }
  }
});

app.listen(port, () => {
  console.log(`noCRM MCP server listening on http://localhost:${port}/mcp and /sse`);
});
