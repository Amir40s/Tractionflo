import logger from './logger';

type OpenAiChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type OpenAiChatResponse = {
  choices?: {
    message?: {
      content?: string;
    };
  }[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  error?: {
    message?: string;
  };
};

export type OpenAiUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

const openAiChatCompletionsEndpoint = "https://api.openai.com/v1/chat/completions";

function formatAiMessagesForTerminal(messages: OpenAiChatMessage[]) {
  return messages
    .map((message, index) => `[${index + 1}] ${message.role.toUpperCase()}\n${message.content}`)
    .join("\n\n");
}

function logAiRequestToTerminal({
  model,
  maxTokens,
  messages,
}: {
  model: string;
  maxTokens: number;
  messages: OpenAiChatMessage[];
}) {
  logger.info("AI REQUEST SENT", {
    endpoint: openAiChatCompletionsEndpoint,
    method: "POST",
    model,
    maxTokens,
    messages,
  });
}

function logAiResponseToTerminal({
  model,
  response,
  data,
  durationMs,
}: {
  model: string;
  response: Response;
  data: OpenAiChatResponse;
  durationMs: number;
}) {
  const content = data.choices?.[0]?.message?.content?.trim() || "";
  const usage = data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

  logger.info("AI RESPONSE RECEIVED", {
    status: response.status,
    statusText: response.statusText,
    model,
    durationMs,
    usage,
    error: data.error?.message || undefined,
    content,
  });
}

export async function requestOpenAiChatCompletion({
  apiKey,
  model,
  messages,
  maxTokens = 180,
  onUsage,
}: {
  apiKey: string;
  model: string;
  messages: OpenAiChatMessage[];
  maxTokens?: number;
  onUsage?: (usage: OpenAiUsage) => Promise<void> | void;
}) {
  logAiRequestToTerminal({ model, maxTokens, messages });

  const startedAt = Date.now();
  const response = await fetch(openAiChatCompletionsEndpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.35,
      max_tokens: maxTokens,
    }),
  });
  const data = (await response.json()) as OpenAiChatResponse;
  logAiResponseToTerminal({
    model,
    response,
    data,
    durationMs: Date.now() - startedAt,
  });

  if (!response.ok) {
    throw new Error(data.error?.message || `OpenAI request failed with status ${response.status}`);
  }

  const content = data.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error("OpenAI returned an empty response.");
  }

  if (data.usage && onUsage) {
    const usage = {
      promptTokens: Math.max(0, Math.round(data.usage.prompt_tokens || 0)),
      completionTokens: Math.max(0, Math.round(data.usage.completion_tokens || 0)),
      totalTokens: Math.max(0, Math.round(data.usage.total_tokens || 0)),
    };

    try {
      await onUsage(usage);
    } catch (error) {
      logger.error("OpenAI usage logging error:", { error });
    }
  }

  return content;
}
