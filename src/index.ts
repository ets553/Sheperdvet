#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { SyncroClient, SyncroError } from "./syncro.js";

const PER_PAGE = z
  .number()
  .int()
  .min(1)
  .max(100)
  .optional()
  .describe("Results per page (max 100, default 25)");
const PAGE = z.number().int().min(1).optional().describe("Page number (1-based)");

const client = SyncroClient.fromEnv();

const server = new McpServer({
  name: "syncromsp",
  version: "0.1.0",
});

function ok(data: unknown): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
  };
}

function fail(err: unknown): CallToolResult {
  if (err instanceof SyncroError) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: JSON.stringify(
            { error: err.message, status: err.status, body: err.body },
            null,
            2
          ),
        },
      ],
    };
  }
  const message = err instanceof Error ? err.message : String(err);
  return { isError: true, content: [{ type: "text", text: `Error: ${message}` }] };
}

function tool<S extends z.ZodRawShape>(
  name: string,
  description: string,
  schema: S,
  handler: (args: z.infer<z.ZodObject<S>>) => Promise<unknown>
) {
  const cb = async (args: z.infer<z.ZodObject<S>>): Promise<CallToolResult> => {
    try {
      const data = await handler(args);
      return ok(data);
    } catch (e) {
      return fail(e);
    }
  };
  // The SDK's BaseToolCallback expects (args, extra) => ..., but we don't use
  // the extra param. Cast to bypass the structural check on the second arg.
  server.registerTool(
    name,
    { description, inputSchema: schema },
    cb as unknown as Parameters<typeof server.registerTool<S, S>>[2]
  );
}

// ---------- Customers ----------

tool(
  "syncro_list_customers",
  "List customers. Supports search by name/email/phone via `query`.",
  {
    query: z.string().optional().describe("Search across name, email, phone, etc."),
    page: PAGE,
    per_page: PER_PAGE,
  },
  ({ query, page, per_page }) =>
    client.get("/customers", { query, page, per_page })
);

tool(
  "syncro_get_customer",
  "Get a single customer by ID.",
  { id: z.number().int().describe("Customer ID") },
  ({ id }) => client.get(`/customers/${id}`)
);

tool(
  "syncro_create_customer",
  "Create a new customer. Provide at minimum business_name OR (firstname + lastname).",
  {
    business_name: z.string().optional(),
    firstname: z.string().optional(),
    lastname: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    mobile: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    notes: z.string().optional(),
    referred_by: z.string().optional(),
  },
  (args) => client.post("/customers", args)
);

tool(
  "syncro_update_customer",
  "Update an existing customer. Only provided fields are changed.",
  {
    id: z.number().int().describe("Customer ID"),
    business_name: z.string().optional(),
    firstname: z.string().optional(),
    lastname: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    mobile: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    notes: z.string().optional(),
  },
  ({ id, ...body }) => client.put(`/customers/${id}`, body)
);

// ---------- Contacts ----------

tool(
  "syncro_list_contacts",
  "List contacts, optionally filtered by customer.",
  {
    customer_id: z.number().int().optional(),
    query: z.string().optional(),
    page: PAGE,
    per_page: PER_PAGE,
  },
  ({ customer_id, query, page, per_page }) =>
    client.get("/contacts", { customer_id, query, page, per_page })
);

tool(
  "syncro_get_contact",
  "Get a single contact by ID.",
  { id: z.number().int() },
  ({ id }) => client.get(`/contacts/${id}`)
);

tool(
  "syncro_create_contact",
  "Create a contact attached to a customer.",
  {
    customer_id: z.number().int(),
    name: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    mobile: z.string().optional(),
    notes: z.string().optional(),
  },
  (args) => client.post("/contacts", args)
);

// ---------- Tickets ----------

tool(
  "syncro_list_tickets",
  "List tickets. Filterable by status, customer, assigned tech.",
  {
    query: z.string().optional().describe("Free-text search"),
    status: z
      .string()
      .optional()
      .describe("Status name (e.g. 'New', 'In Progress', 'Resolved')"),
    customer_id: z.number().int().optional(),
    user_id: z
      .number()
      .int()
      .optional()
      .describe("Assigned technician user ID"),
    since_updated_at: z
      .string()
      .optional()
      .describe("ISO 8601 timestamp; only tickets updated since"),
    page: PAGE,
    per_page: PER_PAGE,
  },
  (args) => client.get("/tickets", args as Record<string, unknown>)
);

tool(
  "syncro_get_ticket",
  "Get a ticket with full details (comments, assets, line items).",
  { id: z.number().int() },
  ({ id }) => client.get(`/tickets/${id}`)
);

tool(
  "syncro_create_ticket",
  "Create a ticket for an existing customer.",
  {
    customer_id: z.number().int(),
    subject: z.string(),
    problem_type: z.string().optional(),
    status: z.string().optional().describe("Defaults to 'New' if omitted"),
    priority: z
      .string()
      .optional()
      .describe("e.g. 'Low', 'Normal', 'High', 'Urgent'"),
    user_id: z.number().int().optional().describe("Assigned tech user ID"),
    asset_id: z.number().int().optional(),
    contact_id: z.number().int().optional(),
    comments_attributes: z
      .array(
        z.object({
          subject: z.string().optional(),
          body: z.string(),
          hidden: z.boolean().optional(),
          tech: z.string().optional(),
        })
      )
      .optional()
      .describe("Initial comments to attach when creating the ticket"),
  },
  (args) => client.post("/tickets", args)
);

tool(
  "syncro_update_ticket",
  "Update a ticket (status, priority, subject, assignment, etc.).",
  {
    id: z.number().int(),
    subject: z.string().optional(),
    status: z.string().optional(),
    priority: z.string().optional(),
    problem_type: z.string().optional(),
    user_id: z.number().int().optional(),
  },
  ({ id, ...body }) => client.put(`/tickets/${id}`, body)
);

tool(
  "syncro_create_ticket_comment",
  "Add a comment to a ticket. Set `hidden: true` for internal-only notes; set `do_not_email: true` to skip notifying the customer.",
  {
    ticket_id: z.number().int(),
    subject: z.string().optional(),
    body: z.string(),
    hidden: z.boolean().optional(),
    do_not_email: z.boolean().optional(),
    tech: z.string().optional(),
  },
  ({ ticket_id, ...body }) =>
    client.post(`/tickets/${ticket_id}/comment`, body)
);

// ---------- Assets ----------

tool(
  "syncro_list_assets",
  "List assets, optionally filtered by customer.",
  {
    customer_id: z.number().int().optional(),
    query: z.string().optional(),
    asset_type_id: z.number().int().optional(),
    page: PAGE,
    per_page: PER_PAGE,
  },
  (args) => client.get("/customer_assets", args as Record<string, unknown>)
);

tool(
  "syncro_get_asset",
  "Get an asset by ID.",
  { id: z.number().int() },
  ({ id }) => client.get(`/customer_assets/${id}`)
);

// ---------- Invoices ----------

tool(
  "syncro_list_invoices",
  "List invoices, optionally filtered by customer or paid status.",
  {
    customer_id: z.number().int().optional(),
    since_updated_at: z.string().optional(),
    page: PAGE,
    per_page: PER_PAGE,
  },
  (args) => client.get("/invoices", args as Record<string, unknown>)
);

tool(
  "syncro_get_invoice",
  "Get an invoice with line items.",
  { id: z.number().int() },
  ({ id }) => client.get(`/invoices/${id}`)
);

// ---------- Estimates ----------

tool(
  "syncro_list_estimates",
  "List estimates, optionally filtered by customer.",
  {
    customer_id: z.number().int().optional(),
    page: PAGE,
    per_page: PER_PAGE,
  },
  (args) => client.get("/estimates", args as Record<string, unknown>)
);

// ---------- RMM Alerts ----------

tool(
  "syncro_list_rmm_alerts",
  "List RMM alerts, optionally filtered by status or asset.",
  {
    status: z
      .enum(["active", "resolved", "all"])
      .optional()
      .describe("Defaults to 'active'"),
    asset_id: z.number().int().optional(),
    page: PAGE,
    per_page: PER_PAGE,
  },
  (args) => client.get("/rmm_alerts", args as Record<string, unknown>)
);

// ---------- main ----------

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Log to stderr so we don't pollute stdio transport.
  console.error("syncromsp MCP server ready");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
