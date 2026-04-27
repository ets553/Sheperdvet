# shepherd-vet-mcp

A [Model Context Protocol](https://modelcontextprotocol.io) server that exposes
[Shepherd Veterinary Software](https://www.shepherd.vet) (shepherd.vet) as a
set of tools an MCP-compatible client (Claude Desktop, Claude Code, Cursor,
etc.) can call.

It wraps the typical Shepherd practice-management domain — patients, clients,
appointments, SOAP notes, invoices, prescriptions, inventory, lab results —
and exposes one tool per operation, plus a generic `shepherd_request` escape
hatch for anything not covered.

> **Note on the API surface.** Shepherd advertises an open API but does not
> publish a public OpenAPI spec at the time of writing. The endpoint paths in
> this server (`/v1/patients`, `/v1/appointments`, …) are reasonable defaults
> based on REST conventions; if your tenant uses different paths, adjust
> [`src/tools.ts`](src/tools.ts) or fall back to `shepherd_request` for raw
> calls. Auth header / scheme are configurable via env vars — see below.

## Tools

| Tool | Description |
| --- | --- |
| `shepherd_request` | Arbitrary authenticated call against the Shepherd API. |
| `shepherd_list_patients` | List patients (paginated, searchable). |
| `shepherd_get_patient` | Fetch a patient by ID. |
| `shepherd_create_patient` | Create a patient. |
| `shepherd_update_patient` | Update a patient. |
| `shepherd_list_clients` | List clients (pet parents). |
| `shepherd_get_client` | Fetch a client by ID. |
| `shepherd_create_client` | Create a client. |
| `shepherd_update_client` | Update a client. |
| `shepherd_list_appointments` | List appointments with filters. |
| `shepherd_get_appointment` | Fetch an appointment by ID. |
| `shepherd_create_appointment` | Schedule an appointment. |
| `shepherd_update_appointment` | Update / reschedule an appointment. |
| `shepherd_cancel_appointment` | Cancel an appointment. |
| `shepherd_list_soaps` | List SOAP notes. |
| `shepherd_get_soap` | Fetch a SOAP note by ID. |
| `shepherd_create_soap` | Create a SOAP note. |
| `shepherd_update_soap` | Update a SOAP note. |
| `shepherd_list_invoices` | List invoices with filters. |
| `shepherd_get_invoice` | Fetch an invoice by ID. |
| `shepherd_create_invoice` | Create an invoice with line items. |
| `shepherd_list_prescriptions` | List prescriptions for a patient. |
| `shepherd_create_prescription` | Create a prescription. |
| `shepherd_list_inventory` | List inventory items. |
| `shepherd_list_lab_results` | List lab results. |

## Install & build

```bash
npm install
npm run build
```

## Configuration

Set these environment variables (see [`.env.example`](.env.example)):

| Var | Default | Notes |
| --- | --- | --- |
| `SHEPHERD_API_KEY` | _(required)_ | API key issued by Shepherd. |
| `SHEPHERD_BASE_URL` | `https://api.shepherd.vet` | Override per tenant if needed. |
| `SHEPHERD_AUTH_HEADER` | `Authorization` | e.g. `X-API-Key` if your API uses that. |
| `SHEPHERD_AUTH_SCHEME` | `Bearer` | Only applied when header is `Authorization`. |
| `SHEPHERD_TIMEOUT_MS` | `30000` | Per-request timeout. |

## Running with Claude Desktop / Claude Code

Add to your MCP server config (e.g. `~/.config/claude/mcp.json` or
`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "shepherd": {
      "command": "node",
      "args": ["/absolute/path/to/shepherd-vet-mcp/dist/index.js"],
      "env": {
        "SHEPHERD_API_KEY": "sk_live_..."
      }
    }
  }
}
```

Or, after `npm install -g .`, use the `shepherd-vet-mcp` bin directly:

```json
{
  "mcpServers": {
    "shepherd": {
      "command": "shepherd-vet-mcp",
      "env": { "SHEPHERD_API_KEY": "sk_live_..." }
    }
  }
}
```

## Development

```bash
npm run dev        # tsc --watch
npm run typecheck  # tsc --noEmit
```

## Example

Once wired up, you can ask your MCP client things like:

- "List today's appointments for Dr. Lee."
- "Create a patient named Biscuit, a 4-year-old male golden retriever for client `cli_123`."
- "Draft a SOAP note for appointment `apt_456` summarising the visit."
- "Generate an invoice for client `cli_123` with one annual exam line item at $85."

## License

MIT
