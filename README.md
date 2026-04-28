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

## Running in Docker

A `Dockerfile` is included. MCP servers communicate over stdio, so the
container must be run with stdin attached (`-i`) — no ports to expose.

### Build the image

```bash
docker build -t syncromsp-mcp .
```

### Run interactively (for testing)

```bash
docker run --rm -i \
  -e SYNCRO_SUBDOMAIN=your-subdomain \
  -e SYNCRO_API_KEY=your-api-key \
  syncromsp-mcp
```

You can also load creds from a file:

```bash
docker run --rm -i --env-file .env syncromsp-mcp
```

### Wire it into Claude Desktop / Claude Code

Point your MCP client at `docker` instead of `node`. The `-i` flag keeps
stdin open and `--rm` auto-cleans the container on exit:

```json
{
  "mcpServers": {
    "syncromsp": {
      "command": "docker",
      "args": [
        "run", "--rm", "-i",
        "-e", "SYNCRO_SUBDOMAIN",
        "-e", "SYNCRO_API_KEY",
        "syncromsp-mcp"
      ],
      "env": {
        "SYNCRO_SUBDOMAIN": "your-subdomain",
        "SYNCRO_API_KEY": "your-api-key"
      }
    }
  }
}
```

The `-e VAR` form (no value) tells Docker to pass through the variable
from the parent process — that's how the values in the `env` block reach
the container.

### Notes

- Do **not** add `-d` (detached) or `-t` (tty) — MCP needs raw stdio.
- Don't bake secrets into the image; always pass them at runtime via
  `-e` or `--env-file`.
- The image runs as a non-root `app` user.
- Use a tag (`syncromsp-mcp:0.1.0`) in production rather than `:latest`
  so client configs pin to a known build.

## API reference

Tools wrap the [Syncro REST API v1](https://api-docs.syncromsp.com/). Pagination
is handled with `page` and `per_page` parameters where Syncro supports it
(default `per_page=25`, max `100`).

## License

MIT
