export type AiWorkflowId = "startConversation" | "answerQuestions" | "qualifyLeads" | "moveToCta";

export type AiWorkflowSetting = {
  id: AiWorkflowId;
  label: string;
  detail: string;
  enabled: boolean;
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
  enabledWorkflows: Record<AiWorkflowId, boolean>;
};

export type AiIntegrationSettings = {
  apiKeySaved: boolean;
  apiKeyPreview: string;
  model: string;
  workflows: AiWorkflowSetting[];
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

export function normalizeAiIntegrationMetadata(metadata: Record<string, unknown>): AiIntegrationSettings {
  const apiKey = metadata.openai_api_key;

  return {
    apiKeySaved: typeof apiKey === "string" && apiKey.length > 0,
    apiKeyPreview: maskOpenAiKey(apiKey),
    model: normalizeOpenAiModel(metadata.openai_model),
    workflows: normalizeAiWorkflows(metadata.ai_integration_workflows),
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
