import OpenAI from 'openai';
import logger from './logger';
import { listKnowledgeSourceIndexes, saveKnowledgeSourceIndex, knowledgeBucketName } from './knowledge-base';
import type { SupabaseClient } from '@supabase/supabase-js';

type OpenAiAssistantProps = {
  apiKey: string;
};

function getClient(apiKey: string) {
  return new OpenAI({ apiKey });
}

export async function getOrCreateAssistant({
  apiKey,
  assistantId,
  name = 'TractionFlo Assistant',
  instructions = 'You are a helpful assistant.',
  model = 'gpt-4o-mini',
}: OpenAiAssistantProps & { assistantId?: string; name?: string; instructions?: string; model?: string }) {
  const openai = getClient(apiKey);
  
  if (assistantId) {
    try {
      const assistant = await openai.beta.assistants.retrieve(assistantId);
      // Update instructions and model if needed
      if (assistant.instructions !== instructions || assistant.model !== model) {
        return await openai.beta.assistants.update(assistantId, { instructions, model });
      }
      return assistant;
    } catch {
      logger.info('Assistant not found or failed to retrieve. Creating new one.', { assistantId });
    }
  }

  return await openai.beta.assistants.create({
    name,
    instructions,
    model,
    tools: [{ type: 'file_search' }],
  });
}

export async function getOrCreateVectorStore({
  apiKey,
  vectorStoreId,
  name = 'TractionFlo Knowledge Base',
}: OpenAiAssistantProps & { vectorStoreId?: string; name?: string }) {
  const openai = getClient(apiKey);

  if (vectorStoreId) {
    try {
      return await openai.vectorStores.retrieve(vectorStoreId);
    } catch {
      logger.info('Vector store not found. Creating new one.', { vectorStoreId });
    }
  }

  return await openai.vectorStores.create({ name });
}

export async function attachVectorStoreToAssistant({
  apiKey,
  assistantId,
  vectorStoreId,
}: OpenAiAssistantProps & { assistantId: string; vectorStoreId: string }) {
  const openai = getClient(apiKey);
  await openai.beta.assistants.update(assistantId, {
    tool_resources: {
      file_search: {
        vector_store_ids: [vectorStoreId],
      },
    },
  });
}

import { toFile } from 'openai';

export async function uploadFileToVectorStore({
  apiKey,
  vectorStoreId,
  fileBuffer,
  fileName,
  mimeType,
}: OpenAiAssistantProps & { vectorStoreId: string; fileBuffer: Buffer; fileName: string; mimeType: string }) {
  const openai = getClient(apiKey);
  
  const file = await toFile(fileBuffer, fileName, { type: mimeType });

  const uploadedFile = await openai.files.create({
    file,
    purpose: 'assistants',
  });

  await openai.vectorStores.files.create(vectorStoreId, {
    file_id: uploadedFile.id,
  });

  return uploadedFile;
}

export async function removeFileFromVectorStore({
  apiKey,
  vectorStoreId,
  fileId,
}: OpenAiAssistantProps & { vectorStoreId: string; fileId: string }) {
  const openai = getClient(apiKey);
  try {
    await openai.vectorStores.files.delete(fileId, { vector_store_id: vectorStoreId });
    await openai.files.delete(fileId);
  } catch (e) {
    logger.error('Failed to remove file from vector store or delete file', { fileId, error: e });
  }
}

export type OpenAiChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export function cleanAssistantReply(text: string): string {
  if (!text) return '';
  return text
    .replace(/【[^】]*】/g, '') // Remove annotations like 【4:0†source】
    .replace(/\*\*/g, '');      // Remove markdown bold asterisks **
}

export async function runAssistantThread({
  apiKey,
  assistantId,
  messages,
  additionalInstructions,
  responseFormat,
  maxTokens = 250,
}: OpenAiAssistantProps & {
  assistantId: string;
  messages: OpenAiChatMessage[];
  additionalInstructions?: string;
  responseFormat?: "auto" | "json_object";
  maxTokens?: number;
}) {
  const openai = getClient(apiKey);

  logger.info('Creating thread and running assistant', { assistantId, messages });
  const startedAt = Date.now();

  const thread = await openai.beta.threads.create({
    messages: messages.map(m => ({ role: m.role, content: m.content })),
  });

  const run = await openai.beta.threads.runs.createAndPoll(thread.id, {
    assistant_id: assistantId,
    additional_instructions: additionalInstructions,
    response_format: responseFormat === "json_object" ? { type: "json_object" } : "auto",
    max_completion_tokens: maxTokens,
  });

  if (run.status === 'completed') {
    const messages = await openai.beta.threads.messages.list(thread.id, { limit: 1 });
    const content = messages.data[0].content;
    const finalReply = content[0].type === 'text' ? content[0].text.value : '';
    const cleanedReply = cleanAssistantReply(finalReply);

    logger.info('AI RESPONSE RECEIVED (Assistant API)', {
      durationMs: Date.now() - startedAt,
      usage: run.usage,
      content: cleanedReply,
    });

    return cleanedReply;
  } else {
    throw new Error(`Run failed with status: ${run.status}`);
  }
}

export async function syncVectorStoreWithStorage({
  apiKey,
  vectorStoreId,
  userId,
  supabase,
}: OpenAiAssistantProps & { vectorStoreId: string; userId: string; supabase: SupabaseClient }) {
  const openai = getClient(apiKey);
  logger.info('Starting syncVectorStoreWithStorage', { userId, vectorStoreId });

  try {
    const sources = await listKnowledgeSourceIndexes(supabase, userId);
    
    let vsFiles;
    try {
      vsFiles = await openai.vectorStores.files.list(vectorStoreId);
    } catch (vsError) {
      logger.error('Failed to list files in vector store', { vectorStoreId, error: vsError });
      return;
    }

    const existingFileIds = new Set(vsFiles.data.map(f => f.id));
    const activeSources = sources.filter(s => s.active);
    const activeSourceFileIds = new Set(activeSources.map(s => s.openAiFileId).filter(Boolean));

    logger.info('Sync counts', {
      totalSources: sources.length,
      activeSources: activeSources.length,
      existingOpenAiFileIds: existingFileIds.size,
    });

    for (const source of activeSources) {
      let shouldUpload = false;
      
      if (!source.openAiFileId || !existingFileIds.has(source.openAiFileId)) {
        shouldUpload = true;
      } else {
        try {
          await openai.files.retrieve(source.openAiFileId);
        } catch {
          logger.warn('File ID in index not found on OpenAI, re-uploading', { fileId: source.openAiFileId });
          shouldUpload = true;
        }
      }

      if (shouldUpload) {
        logger.info('Uploading file to vector store during sync', { fileName: source.fileName });
        try {
          const { data: fileData, error: downloadError } = await supabase.storage
            .from(knowledgeBucketName)
            .download(source.filePath);

          if (downloadError || !fileData) {
            throw new Error(`Download from Supabase failed: ${downloadError?.message}`);
          }

          const fileBuffer = Buffer.from(await fileData.arrayBuffer());
          const uploadedFile = await uploadFileToVectorStore({
            apiKey,
            vectorStoreId,
            fileBuffer,
            fileName: source.fileName,
            mimeType: source.mimeType,
          });

          source.openAiFileId = uploadedFile.id;
          source.updatedAt = new Date().toISOString();
          await saveKnowledgeSourceIndex(supabase, source);
          
          activeSourceFileIds.add(uploadedFile.id);
          logger.info('Successfully synced file to vector store', { fileName: source.fileName, fileId: uploadedFile.id });
        } catch (uploadError) {
          logger.error('Failed to sync file to vector store', { fileName: source.fileName, error: uploadError });
        }
      }
    }

    for (const fileId of existingFileIds) {
      if (!activeSourceFileIds.has(fileId)) {
        logger.info('Removing extra/inactive file from vector store', { fileId });
        try {
          await openai.vectorStores.files.delete(fileId, { vector_store_id: vectorStoreId });
          await openai.files.delete(fileId).catch(() => {});
        } catch (removeError) {
          logger.error('Failed to remove extra file during sync', { fileId, error: removeError });
        }
      }
    }

    logger.info('Finished syncVectorStoreWithStorage successfully');
  } catch (error) {
    logger.error('Error during syncVectorStoreWithStorage:', { error });
  }
}
