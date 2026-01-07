export type TemplateSchema = {
  type: "object";
  properties: Record<string, { type: "string" | "number" | "boolean" }>;
  required?: string[];
};

export type TemplateDef = {
  id: string;
  schema: TemplateSchema;
  projection: {
    feedText?: string;
    feedTitle?: string;
  };
};

export const DEFAULT_TEMPLATE = "blackboard.post.v1";
export const CHAT_TEMPLATE = "blackboard.chat.v1";

export const TEMPLATE_REGISTRY: Record<string, TemplateDef> = {
  "blackboard.post.v1": {
    id: "blackboard.post.v1",
    schema: {
      type: "object",
      properties: {
        text: { type: "string" }
      },
      required: ["text"]
    },
    projection: {
      feedText: "text"
    }
  },
  "blackboard.listing.v1": {
    id: "blackboard.listing.v1",
    schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        price: { type: "number" },
        text: { type: "string" }
      },
      required: ["title", "price"]
    },
    projection: {
      feedTitle: "title",
      feedText: "text"
    }
  },
  "blackboard.chat.v1": {
    id: "blackboard.chat.v1",
    schema: {
      type: "object",
      properties: {
        text: { type: "string" },
        room: { type: "string" }
      },
      required: ["text"]
    },
    projection: {
      feedText: "text"
    }
  }
};

export function validateTemplatePayload(
  template: string,
  payload: Record<string, unknown>
): { ok: true } | { ok: false; reason: string } {
  const def = TEMPLATE_REGISTRY[template];
  if (!def) return { ok: true };

  const { schema } = def;
  if (schema.type !== "object" || payload === null || typeof payload !== "object") {
    return { ok: false, reason: "Payload must be an object" };
  }

  for (const req of schema.required ?? []) {
    if (!(req in payload)) return { ok: false, reason: `Missing field: ${req}` };
  }

  for (const [key, rule] of Object.entries(schema.properties)) {
    if (!(key in payload)) continue;
    const value = payload[key];
    if (rule.type === "string" && typeof value !== "string") {
      return { ok: false, reason: `Field ${key} must be a string` };
    }
    if (rule.type === "number" && typeof value !== "number") {
      return { ok: false, reason: `Field ${key} must be a number` };
    }
    if (rule.type === "boolean" && typeof value !== "boolean") {
      return { ok: false, reason: `Field ${key} must be a boolean` };
    }
  }

  return { ok: true };
}

export function projectFromTemplate(
  template: string,
  payload: Record<string, unknown>
): { title?: string; text?: string } {
  const def = TEMPLATE_REGISTRY[template];
  if (!def) return { text: String((payload as { text?: unknown })?.text ?? "") };

  const titleField = def.projection.feedTitle;
  const textField = def.projection.feedText;

  const titleValue = titleField ? payload[titleField] : undefined;
  const textValue = textField ? payload[textField] : undefined;

  return {
    title: titleValue != null ? String(titleValue) : undefined,
    text: textValue != null ? String(textValue) : undefined
  };
}
