# TeroAI noCRM MCP Connector

This is a small MCP bridge for connecting ChatGPT to the TeroAI noCRM account at:

```text
https://teroai.nocrm.io
```

ChatGPT talks to this server over MCP, and this server talks to noCRM through the noCRM REST API.

## What It Exposes

- `check_nocrm_connection`: verify the noCRM credentials
- `list_leads`: search or list noCRM leads
- `get_lead`: retrieve one lead by ID
- `create_lead`: create a lead after user confirmation
- `add_lead_comment`: add outreach/status notes to a lead

The server intentionally does not expose destructive tools like delete lead.

## Render Setup

The fastest path is to deploy this folder as a Render web service.

### Option A: Upload/Connect This Project

1. Create a new Render account or sign in.
2. Create a new **Web Service**.
3. Connect this project through GitHub, or upload it to a GitHub repo first.
4. Render will detect `render.yaml`.
5. When Render asks for environment variables, add:

```text
NOCRM_TOKEN=your-noCRM-api-key
```

These are already set in `render.yaml`:

```text
NOCRM_SUBDOMAIN=teroai
NOCRM_TOKEN_TYPE=api_key
NODE_VERSION=22
```

### Option B: Manual Render Settings

If you create the service manually:

- Runtime: `Node`
- Build command: `npm install`
- Start command: `npm start`
- Health check path: `/health`
- Environment variables:

```text
NOCRM_SUBDOMAIN=teroai
NOCRM_TOKEN=your-noCRM-api-key
NOCRM_TOKEN_TYPE=api_key
NODE_VERSION=22
```

## Local Setup

```bash
npm install
cp .env.example .env
```

Edit `.env`:

```bash
NOCRM_SUBDOMAIN=teroai
NOCRM_TOKEN=your-api-key
NOCRM_TOKEN_TYPE=api_key
PORT=3000
```

Run it:

```bash
npm run dev
```

Health check:

```bash
curl http://localhost:3000/health
```

## Test With MCP Inspector

```bash
npx @modelcontextprotocol/inspector@latest
```

Use this server URL:

```text
http://localhost:3000/mcp
```

If your tool or ChatGPT screen specifically asks for SSE, use:

```text
http://localhost:3000/sse
```

## Connect In ChatGPT

For a real ChatGPT custom connector, the MCP URL must be reachable from ChatGPT over HTTPS.

In the New App screen:

- Name: `noCRM`
- Description: `Read and update noCRM leads for outreach tracking`
- Connection: `Server URL`
- Server URL: `https://YOUR-RENDER-SERVICE.onrender.com/mcp`
  - If the screen expects an SSE endpoint, use `https://YOUR-RENDER-SERVICE.onrender.com/sse`
- Authentication:
  - For a private/internal deployment, start with `No Authentication` and keep the noCRM API key only on the server as an environment variable.
  - For a multi-user or production deployment, use OAuth in front of this MCP server, usually through your company identity provider.

Do not paste the noCRM API URL into the Server URL field. ChatGPT needs the MCP server URL, not `https://YOUR_SUBDOMAIN.nocrm.io/api/v2`.

## Deployment Notes

Deploy this on Render or another host that supports Node 20+ and HTTPS.

Set these environment variables in the host:

```bash
NOCRM_SUBDOMAIN=your-subdomain
NOCRM_TOKEN=your-api-key
NOCRM_TOKEN_TYPE=api_key
PORT=3000
```

After deployment, test:

```bash
curl https://YOUR_HOSTNAME/health
```

Then use:

```text
https://YOUR_HOSTNAME/mcp
```

as the ChatGPT custom connector server URL.

If the connector screen shows an SSE example URL, use:

```text
https://YOUR_HOSTNAME/sse
```

## What I Still Need From Render

I cannot create the Render service from here unless I have access to your Render account or a GitHub repo connected to Render. Once the service exists, Render will give you a URL ending in `.onrender.com`; paste that URL plus `/mcp` or `/sse` into ChatGPT.

## Security Defaults

- Keep `NOCRM_TOKEN` server-side only.
- Do not commit `.env`.
- Start with the smallest tool set needed for your workflow.
- Add write tools one by one, and keep delete/archive actions out until you have explicit approval rules.
