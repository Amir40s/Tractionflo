import type { RevenueOperatingSnapshot } from "@/lib/revenue-intelligence";

export type AiWorkflowId = "startConversation" | "answerQuestions" | "qualifyLeads" | "moveToCta";

export type AiWorkflowSetting = {
  id: AiWorkflowId;
  label: string;
  detail: string;
  enabled: boolean;
};

export type AiBehaviorSettings = {
  personality: string;
  responseStyle: string;
  knowledgeUsage: string;
  proactiveOutreach: boolean;
  autoTagging: boolean;
};

export type AiLeadInsight = {
  score: number;
  stage: string;
  urgency: "Low" | "Medium" | "High";
  intent: string;
  summary: string;
  signals: string[];
  missing: string[];
  recommendedAction: string;
  cta: string;
};

export type AiWorkflowRunResult = {
  starter: string;
  reply: string;
  cta: string;
  lead: AiLeadInsight;
  ros?: RevenueOperatingSnapshot;
  enabledWorkflows: Record<AiWorkflowId, boolean>;
};

export type AiIntegrationSettings = {
  apiKeySaved: boolean;
  apiKeyPreview: string;
  model: string;
  workflows: AiWorkflowSetting[];
  behavior: AiBehaviorSettings;
  systemPrompt: string;
  leadQualificationRules: string;
  ctaMessage: string;
  autoSend: boolean;
};

export const openAiModelOptions = ["gpt-4.1-mini", "gpt-4o-mini", "gpt-4.1", "gpt-4o"];

export const defaultAiWorkflows: AiWorkflowSetting[] = [
  {
    id: "startConversation",
    label: "AI Starts Conversation",
    detail: "Drafts a first message when a new lead appears.",
    enabled: true,
  },
  {
    id: "answerQuestions",
    label: "AI Answers Questions",
    detail: "Uses your brand voice and knowledge to reply in DMs.",
    enabled: true,
  },
  {
    id: "qualifyLeads",
    label: "AI Qualifies Leads",
    detail: "Detects budget, urgency, fit, and buying intent.",
    enabled: true,
  },
  {
    id: "moveToCta",
    label: "AI Moves Lead to CTA",
    detail: "Guides ready leads toward booking, pricing, or checkout.",
    enabled: true,
  },
];

export const defaultAiBehaviorSettings: AiBehaviorSettings = {
  personality: "Professional",
  responseStyle: "Helpful & Friendly",
  knowledgeUsage: "Always",
  proactiveOutreach: true,
  autoTagging: true,
};

export const defaultAiLeadInsight: AiLeadInsight = {
  score: 0,
  stage: "Unqualified",
  urgency: "Low",
  intent: "Unknown",
  summary: "No AI qualification has been generated yet.",
  signals: [],
  missing: [],
  recommendedAction: "Review the conversation manually.",
  cta: "Ask one clear follow-up question.",
};

export const defaultAiIntegrationSettings: AiIntegrationSettings = {
  apiKeySaved: false,
  apiKeyPreview: "",
  model: openAiModelOptions[0],
  workflows: defaultAiWorkflows,
  behavior: defaultAiBehaviorSettings,
  systemPrompt:
    "You are TractionFlo's Instagram DM assistant. Reply like a helpful creator support rep: concise, friendly, accurate, and focused on the user's next best step.",
  leadQualificationRules:
    "Qualify leads by budget, timeline, problem fit, engagement intent, and whether they are ready for a call or pricing.",
  ctaMessage: "Would you like to book a quick call or should I send pricing details here?",
  autoSend: false,
};

export function maskOpenAiKey(apiKey: unknown) {
  if (typeof apiKey !== "string" || apiKey.length < 12) {
    return "";
  }

  return `${apiKey.slice(0, 7)}...${apiKey.slice(-4)}`;
}

export function isOpenAiKeyLike(apiKey: string) {
  return apiKey.startsWith("sk-") && apiKey.length >= 20;
}

export function normalizeOpenAiModel(model: unknown) {
  if (typeof model !== "string") {
    return defaultAiIntegrationSettings.model;
  }

  return model.trim() || defaultAiIntegrationSettings.model;
}

export function normalizeAiWorkflows(workflows: unknown): AiWorkflowSetting[] {
  if (!Array.isArray(workflows)) {
    return defaultAiWorkflows;
  }

  return defaultAiWorkflows.map((workflow) => {
    const storedWorkflow = workflows.find(
      (item): item is Partial<AiWorkflowSetting> =>
        Boolean(item) &&
        typeof item === "object" &&
        "id" in item &&
        (item as Partial<AiWorkflowSetting>).id === workflow.id
    );

    return {
      ...workflow,
      enabled: typeof storedWorkflow?.enabled === "boolean" ? storedWorkflow.enabled : workflow.enabled,
    };
  });
}

export function sanitizeAiText(value: unknown, fallback: string, maxLength = 1200) {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : fallback;
}

function normalizeAiBehaviorValue(value: unknown, options: string[], fallback: string) {
  if (typeof value !== "string") {
    return fallback;
  }

  return options.includes(value) ? value : fallback;
}

function normalizeAiBoolean(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") {
    return value;
  }

  return fallback;
}

export function normalizeAiBehaviorSettings(value: unknown, metadata: Record<string, unknown> = {}): AiBehaviorSettings {
  const behavior = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return {
    personality: normalizeAiBehaviorValue(
      behavior.personality ?? metadata.ai_personality,
      ["Professional", "Friendly", "Playful", "Direct"],
      defaultAiBehaviorSettings.personality
    ),
    responseStyle: normalizeAiBehaviorValue(
      behavior.responseStyle ?? metadata.ai_response_style,
      ["Helpful & Friendly", "Concise", "Sales focused", "Support first"],
      defaultAiBehaviorSettings.responseStyle
    ),
    knowledgeUsage: normalizeAiBehaviorValue(
      behavior.knowledgeUsage ?? metadata.ai_knowledge_usage,
      ["Always", "Only when confident", "Ask first"],
      defaultAiBehaviorSettings.knowledgeUsage
    ),
    proactiveOutreach: normalizeAiBoolean(
      behavior.proactiveOutreach ?? metadata.ai_proactive_outreach,
      defaultAiBehaviorSettings.proactiveOutreach
    ),
    autoTagging: normalizeAiBoolean(
      behavior.autoTagging ?? metadata.ai_auto_tagging,
      defaultAiBehaviorSettings.autoTagging
    ),
  };
}

export function getAiBehaviorPrompt(behavior: AiBehaviorSettings) {
  const knowledgeRule =
    behavior.knowledgeUsage === "Always"
      ? "Use saved business knowledge proactively when it helps the customer."
      : behavior.knowledgeUsage === "Only when confident"
        ? "Only use business knowledge when the answer is clearly supported; ask a follow-up when uncertain."
        : "Ask a short clarifying question before giving detailed business-specific claims.";

  return `AI assistant behavior:
- Personality: ${behavior.personality}
- Response style: ${behavior.responseStyle}
- Knowledge usage: ${behavior.knowledgeUsage}. ${knowledgeRule}
- Proactive outreach: ${behavior.proactiveOutreach ? "enabled" : "disabled"}
- Auto tagging: ${behavior.autoTagging ? "enabled" : "disabled"}

Follow the selected personality and response style in every Instagram DM.`;
}

export function normalizeAiIntegrationMetadata(metadata: Record<string, unknown>): AiIntegrationSettings {
  const apiKey = metadata.openai_api_key;

  return {
    apiKeySaved: typeof apiKey === "string" && apiKey.length > 0,
    apiKeyPreview: maskOpenAiKey(apiKey),
    model: normalizeOpenAiModel(metadata.openai_model),
    workflows: normalizeAiWorkflows(metadata.ai_integration_workflows),
    behavior: normalizeAiBehaviorSettings(metadata.ai_behavior, metadata),
    systemPrompt: sanitizeAiText(
      metadata.ai_integration_system_prompt,
      defaultAiIntegrationSettings.systemPrompt,
      1800
    ),
    leadQualificationRules: sanitizeAiText(
      metadata.ai_integration_lead_rules,
      defaultAiIntegrationSettings.leadQualificationRules,
      1400
    ),
    ctaMessage: sanitizeAiText(metadata.ai_integration_cta, defaultAiIntegrationSettings.ctaMessage, 600),
    autoSend:
      typeof metadata.ai_integration_auto_send === "boolean"
        ? metadata.ai_integration_auto_send
        : defaultAiIntegrationSettings.autoSend,
  };
}

export function getStoredOpenAiKey(metadata: Record<string, unknown>) {
  const apiKey = metadata.openai_api_key;
  return typeof apiKey === "string" ? apiKey : "";
}

export function getEnabledWorkflowMap(workflows: AiWorkflowSetting[]): Record<AiWorkflowId, boolean> {
  return workflows.reduce(
    (enabledMap, workflow) => ({
      ...enabledMap,
      [workflow.id]: workflow.enabled,
    }),
    {
      startConversation: false,
      answerQuestions: false,
      qualifyLeads: false,
      moveToCta: false,
    } as Record<AiWorkflowId, boolean>
  );
}
