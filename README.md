# SyncroMSP MCP Server

A [Model Context Protocol](https://modelcontextprotocol.io) server that exposes
[SyncroMSP](https://syncromsp.com) as a set of tools, so MCP-aware clients
(Claude Desktop, Claude Code, Cursor, etc.) can read and manage customers,
tickets, contacts, assets, invoices, estimates, and RMM alerts.

## Features

Tools provided:

- **Customers**: `syncro_list_customers`, `syncro_get_customer`, `syncro_create_customer`, `syncro_update_customer`
- **Contacts**: `syncro_list_contacts`, `syncro_get_contact`, `syncro_create_contact`
- **Tickets**: `syncro_list_tickets`, `syncro_get_ticket`, `syncro_create_ticket`, `syncro_update_ticket`, `syncro_create_ticket_comment`
- **Assets**: `syncro_list_assets`, `syncro_get_asset`
- **Invoices**: `syncro_list_invoices`, `syncro_get_invoice`
- **Estimates**: `syncro_list_estimates`
- **RMM**: `syncro_list_rmm_alerts`

## Setup

```bash
npm install
npm run build
```

Create a `.env` (or pass env vars another way):

```bash
cp .env.example .env
# edit .env and set SYNCRO_SUBDOMAIN and SYNCRO_API_KEY
```

Generate an API token in Syncro under **Admin → API Tokens**. Grant the token
the read/write permissions you want exposed.

## Usage

### Claude Desktop / Claude Code

Add to your MCP config (`~/.claude/claude_desktop_config.json` or
`.mcp.json` in a project):

```json
{
  "mcpServers": {
    "syncromsp": {
      "command": "node",
      "args": ["/absolute/path/to/syncromsp-mcp-server/dist/index.js"],
      "env": {
        "SYNCRO_SUBDOMAIN": "your-subdomain",
        "SYNCRO_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Standalone

```bash
SYNCRO_SUBDOMAIN=your-subdomain SYNCRO_API_KEY=your-api-key npm start
```

The server speaks MCP over stdio.

## API reference

Tools wrap the [Syncro REST API v1](https://api-docs.syncromsp.com/). Pagination
is handled with `page` and `per_page` parameters where Syncro supports it
(default `per_page=25`, max `100`).

## License

MIT
