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
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
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
      console.error("OpenAI usage logging error:", error);
    }
  }

  return content;
}
