import { z } from "zod";
import type { ShepherdClient } from "./client.js";

type JsonSchema = Record<string, unknown>;

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  handler: (input: unknown, client: ShepherdClient) => Promise<unknown>;
}

const PaginationSchema = z.object({
  page: z.number().int().min(1).optional().describe("1-indexed page number."),
  per_page: z.number().int().min(1).max(200).optional().describe("Items per page (1-200)."),
  q: z.string().optional().describe("Free-text search query."),
});
type Pagination = z.infer<typeof PaginationSchema>;

function paginationQuery(p: Pagination): Record<string, string | number | undefined> {
  return { page: p.page, per_page: p.per_page, q: p.q };
}

const PatientCreate = z.object({
  name: z.string().min(1),
  species: z.string().optional(),
  breed: z.string().optional(),
  sex: z.enum(["male", "female", "unknown"]).optional(),
  date_of_birth: z.string().optional().describe("ISO 8601 date, e.g. 2020-04-12."),
  weight_kg: z.number().positive().optional(),
  client_id: z.string().describe("ID of the owning client (pet parent)."),
  microchip: z.string().optional(),
  notes: z.string().optional(),
});

const ClientCreate = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address_line1: z.string().optional(),
  address_line2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().optional(),
  notes: z.string().optional(),
});

const AppointmentCreate = z.object({
  patient_id: z.string(),
  client_id: z.string().optional(),
  staff_id: z.string().optional().describe("Veterinarian or staff member ID."),
  starts_at: z.string().describe("ISO 8601 timestamp."),
  ends_at: z.string().optional().describe("ISO 8601 timestamp."),
  reason: z.string().optional(),
  status: z.enum(["scheduled", "checked_in", "in_progress", "completed", "cancelled"]).optional(),
  notes: z.string().optional(),
});

const SoapCreate = z.object({
  patient_id: z.string(),
  appointment_id: z.string().optional(),
  subjective: z.string().optional(),
  objective: z.string().optional(),
  assessment: z.string().optional(),
  plan: z.string().optional(),
});

const InvoiceCreate = z.object({
  client_id: z.string(),
  patient_id: z.string().optional(),
  line_items: z
    .array(
      z.object({
        description: z.string(),
        quantity: z.number().positive(),
        unit_price: z.number().nonnegative(),
        product_id: z.string().optional(),
      }),
    )
    .min(1),
  notes: z.string().optional(),
});

const PrescriptionCreate = z.object({
  patient_id: z.string(),
  medication: z.string(),
  dosage: z.string(),
  frequency: z.string(),
  duration: z.string().optional(),
  refills: z.number().int().nonnegative().optional(),
  notes: z.string().optional(),
});

function toJsonSchema(schema: z.ZodTypeAny): JsonSchema {
  return zodToJsonSchema(schema);
}

export function buildTools(): ToolDefinition[] {
  const tools: ToolDefinition[] = [
    // ---- Generic escape hatch ----
    {
      name: "shepherd_request",
      description:
        "Make an arbitrary authenticated request against the Shepherd API. Use this when no specific tool exists for the operation you need.",
      inputSchema: toJsonSchema(
        z.object({
          path: z.string().describe("API path, e.g. /v1/patients/123."),
          method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).optional(),
          query: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
          body: z.unknown().optional(),
        }),
      ),
      handler: async (input, client) => {
        const args = z
          .object({
            path: z.string(),
            method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).optional(),
            query: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
            body: z.unknown().optional(),
          })
          .parse(input);
        return client.request(args.path, {
          method: args.method,
          query: args.query,
          body: args.body,
        });
      },
    },

    // ---- Patients ----
    {
      name: "shepherd_list_patients",
      description: "List patients (animals) in the practice. Supports pagination and search.",
      inputSchema: toJsonSchema(PaginationSchema),
      handler: async (input, client) => {
        const args = PaginationSchema.parse(input ?? {});
        return client.request("/v1/patients", { query: paginationQuery(args) });
      },
    },
    {
      name: "shepherd_get_patient",
      description: "Fetch a single patient by ID.",
      inputSchema: toJsonSchema(z.object({ id: z.string() })),
      handler: async (input, client) => {
        const { id } = z.object({ id: z.string() }).parse(input);
        return client.request(`/v1/patients/${encodeURIComponent(id)}`);
      },
    },
    {
      name: "shepherd_create_patient",
      description: "Create a new patient record.",
      inputSchema: toJsonSchema(PatientCreate),
      handler: async (input, client) => {
        const body = PatientCreate.parse(input);
        return client.request("/v1/patients", { method: "POST", body });
      },
    },
    {
      name: "shepherd_update_patient",
      description: "Update fields on an existing patient.",
      inputSchema: toJsonSchema(
        z.object({ id: z.string() }).merge(PatientCreate.partial()),
      ),
      handler: async (input, client) => {
        const args = z.object({ id: z.string() }).merge(PatientCreate.partial()).parse(input);
        const { id, ...body } = args;
        return client.request(`/v1/patients/${encodeURIComponent(id)}`, {
          method: "PATCH",
          body,
        });
      },
    },

    // ---- Clients (pet parents) ----
    {
      name: "shepherd_list_clients",
      description: "List clients (pet parents). Supports pagination and free-text search.",
      inputSchema: toJsonSchema(PaginationSchema),
      handler: async (input, client) => {
        const args = PaginationSchema.parse(input ?? {});
        return client.request("/v1/clients", { query: paginationQuery(args) });
      },
    },
    {
      name: "shepherd_get_client",
      description: "Fetch a single client by ID.",
      inputSchema: toJsonSchema(z.object({ id: z.string() })),
      handler: async (input, client) => {
        const { id } = z.object({ id: z.string() }).parse(input);
        return client.request(`/v1/clients/${encodeURIComponent(id)}`);
      },
    },
    {
      name: "shepherd_create_client",
      description: "Create a new client (pet parent).",
      inputSchema: toJsonSchema(ClientCreate),
      handler: async (input, client) => {
        const body = ClientCreate.parse(input);
        return client.request("/v1/clients", { method: "POST", body });
      },
    },
    {
      name: "shepherd_update_client",
      description: "Update fields on an existing client.",
      inputSchema: toJsonSchema(z.object({ id: z.string() }).merge(ClientCreate.partial())),
      handler: async (input, client) => {
        const args = z.object({ id: z.string() }).merge(ClientCreate.partial()).parse(input);
        const { id, ...body } = args;
        return client.request(`/v1/clients/${encodeURIComponent(id)}`, {
          method: "PATCH",
          body,
        });
      },
    },

    // ---- Appointments ----
    {
      name: "shepherd_list_appointments",
      description:
        "List appointments. Filter by date range and/or staff member. Supports pagination.",
      inputSchema: toJsonSchema(
        PaginationSchema.merge(
          z.object({
            from: z.string().optional().describe("ISO 8601 start of range."),
            to: z.string().optional().describe("ISO 8601 end of range."),
            staff_id: z.string().optional(),
            patient_id: z.string().optional(),
            status: z
              .enum(["scheduled", "checked_in", "in_progress", "completed", "cancelled"])
              .optional(),
          }),
        ),
      ),
      handler: async (input, client) => {
        const args = PaginationSchema.merge(
          z.object({
            from: z.string().optional(),
            to: z.string().optional(),
            staff_id: z.string().optional(),
            patient_id: z.string().optional(),
            status: z
              .enum(["scheduled", "checked_in", "in_progress", "completed", "cancelled"])
              .optional(),
          }),
        ).parse(input ?? {});
        return client.request("/v1/appointments", {
          query: {
            ...paginationQuery(args),
            from: args.from,
            to: args.to,
            staff_id: args.staff_id,
            patient_id: args.patient_id,
            status: args.status,
          },
        });
      },
    },
    {
      name: "shepherd_get_appointment",
      description: "Fetch a single appointment by ID.",
      inputSchema: toJsonSchema(z.object({ id: z.string() })),
      handler: async (input, client) => {
        const { id } = z.object({ id: z.string() }).parse(input);
        return client.request(`/v1/appointments/${encodeURIComponent(id)}`);
      },
    },
    {
      name: "shepherd_create_appointment",
      description: "Create a new appointment.",
      inputSchema: toJsonSchema(AppointmentCreate),
      handler: async (input, client) => {
        const body = AppointmentCreate.parse(input);
        return client.request("/v1/appointments", { method: "POST", body });
      },
    },
    {
      name: "shepherd_update_appointment",
      description: "Update an existing appointment (e.g. reschedule, change status).",
      inputSchema: toJsonSchema(
        z.object({ id: z.string() }).merge(AppointmentCreate.partial()),
      ),
      handler: async (input, client) => {
        const args = z.object({ id: z.string() }).merge(AppointmentCreate.partial()).parse(input);
        const { id, ...body } = args;
        return client.request(`/v1/appointments/${encodeURIComponent(id)}`, {
          method: "PATCH",
          body,
        });
      },
    },
    {
      name: "shepherd_cancel_appointment",
      description: "Cancel an appointment.",
      inputSchema: toJsonSchema(
        z.object({ id: z.string(), reason: z.string().optional() }),
      ),
      handler: async (input, client) => {
        const args = z.object({ id: z.string(), reason: z.string().optional() }).parse(input);
        return client.request(`/v1/appointments/${encodeURIComponent(args.id)}/cancel`, {
          method: "POST",
          body: { reason: args.reason },
        });
      },
    },

    // ---- SOAP notes ----
    {
      name: "shepherd_list_soaps",
      description: "List SOAP notes for a patient or appointment.",
      inputSchema: toJsonSchema(
        PaginationSchema.merge(
          z.object({
            patient_id: z.string().optional(),
            appointment_id: z.string().optional(),
          }),
        ),
      ),
      handler: async (input, client) => {
        const args = PaginationSchema.merge(
          z.object({
            patient_id: z.string().optional(),
            appointment_id: z.string().optional(),
          }),
        ).parse(input ?? {});
        return client.request("/v1/soaps", {
          query: {
            ...paginationQuery(args),
            patient_id: args.patient_id,
            appointment_id: args.appointment_id,
          },
        });
      },
    },
    {
      name: "shepherd_get_soap",
      description: "Fetch a SOAP note by ID.",
      inputSchema: toJsonSchema(z.object({ id: z.string() })),
      handler: async (input, client) => {
        const { id } = z.object({ id: z.string() }).parse(input);
        return client.request(`/v1/soaps/${encodeURIComponent(id)}`);
      },
    },
    {
      name: "shepherd_create_soap",
      description: "Create a new SOAP note (subjective/objective/assessment/plan).",
      inputSchema: toJsonSchema(SoapCreate),
      handler: async (input, client) => {
        const body = SoapCreate.parse(input);
        return client.request("/v1/soaps", { method: "POST", body });
      },
    },
    {
      name: "shepherd_update_soap",
      description: "Update an existing SOAP note.",
      inputSchema: toJsonSchema(z.object({ id: z.string() }).merge(SoapCreate.partial())),
      handler: async (input, client) => {
        const args = z.object({ id: z.string() }).merge(SoapCreate.partial()).parse(input);
        const { id, ...body } = args;
        return client.request(`/v1/soaps/${encodeURIComponent(id)}`, {
          method: "PATCH",
          body,
        });
      },
    },

    // ---- Invoices ----
    {
      name: "shepherd_list_invoices",
      description: "List invoices. Filter by client or patient.",
      inputSchema: toJsonSchema(
        PaginationSchema.merge(
          z.object({
            client_id: z.string().optional(),
            patient_id: z.string().optional(),
            status: z.enum(["draft", "open", "paid", "void"]).optional(),
          }),
        ),
      ),
      handler: async (input, client) => {
        const args = PaginationSchema.merge(
          z.object({
            client_id: z.string().optional(),
            patient_id: z.string().optional(),
            status: z.enum(["draft", "open", "paid", "void"]).optional(),
          }),
        ).parse(input ?? {});
        return client.request("/v1/invoices", {
          query: {
            ...paginationQuery(args),
            client_id: args.client_id,
            patient_id: args.patient_id,
            status: args.status,
          },
        });
      },
    },
    {
      name: "shepherd_get_invoice",
      description: "Fetch an invoice by ID.",
      inputSchema: toJsonSchema(z.object({ id: z.string() })),
      handler: async (input, client) => {
        const { id } = z.object({ id: z.string() }).parse(input);
        return client.request(`/v1/invoices/${encodeURIComponent(id)}`);
      },
    },
    {
      name: "shepherd_create_invoice",
      description: "Create an invoice with one or more line items.",
      inputSchema: toJsonSchema(InvoiceCreate),
      handler: async (input, client) => {
        const body = InvoiceCreate.parse(input);
        return client.request("/v1/invoices", { method: "POST", body });
      },
    },

    // ---- Prescriptions ----
    {
      name: "shepherd_list_prescriptions",
      description: "List prescriptions for a patient.",
      inputSchema: toJsonSchema(
        PaginationSchema.merge(z.object({ patient_id: z.string().optional() })),
      ),
      handler: async (input, client) => {
        const args = PaginationSchema.merge(
          z.object({ patient_id: z.string().optional() }),
        ).parse(input ?? {});
        return client.request("/v1/prescriptions", {
          query: { ...paginationQuery(args), patient_id: args.patient_id },
        });
      },
    },
    {
      name: "shepherd_create_prescription",
      description: "Create a prescription for a patient.",
      inputSchema: toJsonSchema(PrescriptionCreate),
      handler: async (input, client) => {
        const body = PrescriptionCreate.parse(input);
        return client.request("/v1/prescriptions", { method: "POST", body });
      },
    },

    // ---- Inventory ----
    {
      name: "shepherd_list_inventory",
      description: "List inventory items / products.",
      inputSchema: toJsonSchema(PaginationSchema),
      handler: async (input, client) => {
        const args = PaginationSchema.parse(input ?? {});
        return client.request("/v1/inventory", { query: paginationQuery(args) });
      },
    },

    // ---- Lab results ----
    {
      name: "shepherd_list_lab_results",
      description: "List lab results, optionally filtered by patient.",
      inputSchema: toJsonSchema(
        PaginationSchema.merge(z.object({ patient_id: z.string().optional() })),
      ),
      handler: async (input, client) => {
        const args = PaginationSchema.merge(
          z.object({ patient_id: z.string().optional() }),
        ).parse(input ?? {});
        return client.request("/v1/lab_results", {
          query: { ...paginationQuery(args), patient_id: args.patient_id },
        });
      },
    },
  ];

  return tools;
}

// ---------------------------------------------------------------------------
// Minimal Zod -> JSON Schema (Draft 7) converter sufficient for MCP tool input.
// We avoid a third-party dependency to keep the install footprint small.
// ---------------------------------------------------------------------------
function zodToJsonSchema(schema: z.ZodTypeAny): JsonSchema {
  const def: any = (schema as any)._def;
  const typeName: string = def.typeName;

  switch (typeName) {
    case "ZodString": {
      const out: JsonSchema = { type: "string" };
      const description = (schema as any).description;
      if (description) out.description = description;
      const checks: any[] = def.checks ?? [];
      for (const c of checks) {
        if (c.kind === "email") out.format = "email";
        if (c.kind === "url") out.format = "uri";
        if (c.kind === "min") out.minLength = c.value;
        if (c.kind === "max") out.maxLength = c.value;
      }
      return out;
    }
    case "ZodNumber": {
      const out: JsonSchema = { type: "number" };
      const description = (schema as any).description;
      if (description) out.description = description;
      const checks: any[] = def.checks ?? [];
      for (const c of checks) {
        if (c.kind === "int") out.type = "integer";
        if (c.kind === "min") out.minimum = c.value;
        if (c.kind === "max") out.maximum = c.value;
      }
      return out;
    }
    case "ZodBoolean":
      return { type: "boolean" };
    case "ZodLiteral":
      return { const: def.value };
    case "ZodEnum":
      return { type: "string", enum: def.values };
    case "ZodNativeEnum":
      return { enum: Object.values(def.values) };
    case "ZodArray": {
      return {
        type: "array",
        items: zodToJsonSchema(def.type),
      };
    }
    case "ZodObject": {
      const shape = def.shape();
      const properties: Record<string, JsonSchema> = {};
      const required: string[] = [];
      for (const [k, v] of Object.entries(shape)) {
        const child = v as z.ZodTypeAny;
        properties[k] = zodToJsonSchema(child);
        if (!child.isOptional()) required.push(k);
      }
      const out: JsonSchema = { type: "object", properties };
      if (required.length) out.required = required;
      return out;
    }
    case "ZodOptional":
      return zodToJsonSchema(def.innerType);
    case "ZodNullable": {
      const inner = zodToJsonSchema(def.innerType) as any;
      const t = inner.type;
      if (typeof t === "string") inner.type = [t, "null"];
      return inner;
    }
    case "ZodDefault":
      return zodToJsonSchema(def.innerType);
    case "ZodUnion": {
      return { anyOf: def.options.map((o: z.ZodTypeAny) => zodToJsonSchema(o)) };
    }
    case "ZodRecord":
      return { type: "object", additionalProperties: zodToJsonSchema(def.valueType) };
    case "ZodAny":
    case "ZodUnknown":
      return {};
    case "ZodEffects":
      return zodToJsonSchema(def.schema);
    default:
      return {};
  }
}
