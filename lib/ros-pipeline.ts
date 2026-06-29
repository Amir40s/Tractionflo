import { runAssistantThread } from '@/lib/openai-assistants';
import { resolvePlatformAiConfig } from '@/lib/platform-ai-config';
import { loadRevenueOutcomeProviderSettings } from '@/lib/revenue-provider-execution';
import { formatRevenueLearningForPrompt } from '@/lib/revenue-learning';
import { getEnabledWorkflowMap, getAiBehaviorPrompt, defaultAiLeadInsight } from '@/lib/ai-integration';
import {
  type RevenueOperatingSnapshot,
  buildFallbackRevenueOperatingSnapshot,
  normalizeRevenueOperatingSnapshot,
  mergeBuyerIntelligenceProfiles,
  mergeRevenueMemoryProfiles,
  persistRevenueOperatingSnapshot,
  loadRosProspectBuyerProfile,
  loadRosProspectRevenueMemory,
  formatBuyerIntelligenceForPrompt,
  formatRevenueMemoryForPrompt,
} from '@/lib/revenue-intelligence';
import { applyRevenueStrategy } from '@/lib/revenue-strategy';
import { applyRevenueOutcomeAction } from '@/lib/revenue-outcome-actions';
import { formatRevenueOutcomeProvidersForPrompt, revenueOutcomeProvidersMetadataKey } from '@/lib/revenue-outcome-providers';
import { getConditionalCtaPrompt, removeUnrequestedBookingCta } from '@/lib/booking-cta-policy';
import {
  buildCatalogSearchText,
  buildCatalogOfferReply,
  findCatalogOffers,
  formatCatalogForPrompt,
  getCatalogDiscoveryState,
  getInstagramProductCatalogForUser,
  isFreshCatalogCategoryRequest,
  isCatalogDiscoveryOnlyRequest,
  shouldUseSingleCatalogOffer,
} from '@/lib/instagram-product-catalog';
import { detectConversationEscalation, escalationRulesMetadataKey, shouldPauseAiForEscalation } from '@/lib/conversation-escalation';
import logger from '@/lib/logger';
import { createSupabaseServiceClient } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

export type RosPipelineInput = {
  supabase: ReturnType<typeof createSupabaseServiceClient>;
  user: User;
  participant: {
    id: string;
    username?: string;
    name?: string;
  };
  conversationId: string;
  latestText: string;
  messages: Array<{ from?: 'me' | 'user' | 'note'; text?: string; time?: string }>;
  forceRefresh?: boolean;
  recentCatalogDecline?: boolean;
};

export type RosPipelineResult = {
  reply: string;
  starter: string;
  cta: string;
  handoff: boolean;
  escalation: any | null;
  lead: any;
  ros: any;
  catalogOffer: any | null;
  catalogOffers: any[];
  catalogCheckoutReady: boolean;
};

function formatConversationLine(message: any) {
  const sender = message.from === 'me' ? 'Business' : message.from === 'note' ? 'Internal note' : 'Instagram user';
  const text = typeof message.text === 'string' && message.text.trim() ? message.text.trim() : '';
  const body = text || 'Sent an attachment';

  return body
    .split(/\r?\n/)
    .map((line: string) => line.trim())
    .filter(Boolean)
    .map((line: string) => `${sender}: ${line}`)
    .join('\n');
}

function extractJsonObject(value: string) {
  const fencedMatch = value.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fencedMatch?.[1] || value;
  const firstBrace = candidate.indexOf('{');
  const lastBrace = candidate.lastIndexOf('}');

  // If no JSON braces found, the AI returned plain text — treat it as the reply
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    const plainText = value.trim();
    logger.warn('ROS Pipeline: AI returned plain text instead of JSON. Using as reply fallback.', { preview: plainText.slice(0, 120) });
    return { reply: plainText, starter: '', cta: '', lead: null, ros: null } as Record<string, unknown>;
  }

  try {
    return JSON.parse(candidate.slice(firstBrace, lastBrace + 1)) as Record<string, unknown>;
  } catch (parseError) {
    const plainText = value.trim();
    logger.warn('ROS Pipeline: Failed to parse AI JSON response. Using as reply fallback.', { preview: plainText.slice(0, 120) });
    return { reply: plainText, starter: '', cta: '', lead: null, ros: null } as Record<string, unknown>;
  }
}

function clampScore(score: unknown) {
  const numericScore = typeof score === 'number' ? score : Number(score);
  if (!Number.isFinite(numericScore)) return defaultAiLeadInsight.score;
  return Math.max(0, Math.min(100, Math.round(numericScore)));
}

function normalizeList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map((item) => item.trim())
    .slice(0, 5);
}

function normalizeUrgency(value: unknown): any {
  if (value === 'High' || value === 'Medium' || value === 'Low') return value;
  return defaultAiLeadInsight.urgency;
}

function normalizeText(value: unknown, fallback: string, maxLength = 500) {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : fallback;
}

function normalizeLeadInsight(value: unknown): any {
  if (!value || typeof value !== 'object') return defaultAiLeadInsight;
  const lead = value as Record<string, unknown>;
  return {
    score: clampScore(lead.score),
    stage: normalizeText(lead.stage, defaultAiLeadInsight.stage, 80),
    urgency: normalizeUrgency(lead.urgency),
    intent: normalizeText(lead.intent, defaultAiLeadInsight.intent, 120),
    summary: normalizeText(lead.summary, defaultAiLeadInsight.summary, 500),
    signals: normalizeList(lead.signals),
    missing: normalizeList(lead.missing),
    recommendedAction: normalizeText(lead.recommendedAction, defaultAiLeadInsight.recommendedAction, 260),
    cta: normalizeText(lead.cta, defaultAiLeadInsight.cta, 260),
  };
}

export async function runRosPipeline(input: RosPipelineInput): Promise<RosPipelineResult> {
  const {
    supabase,
    user,
    participant,
    conversationId,
    latestText,
    messages,
    forceRefresh = false,
    recentCatalogDecline = false,
  } = input;

  const metadata = (user.user_metadata || {}) as Record<string, unknown>;

  logger.info("ROS Pipeline: Starting processing", { conversationId, participantId: participant.id });

  // ==========================================
  // LAYER 9: ESCALATION INTELLIGENCE (Pre-Run)
  // ==========================================
  logger.info("ROS Pipeline [Layer 9 - Escalation Intelligence]: Pre-evaluating escalation rules...");
  const escalation = detectConversationEscalation(messages as any, {
    rules: metadata[escalationRulesMetadataKey],
  });
  const pauseForEscalation = shouldPauseAiForEscalation(escalation);

  if (escalation && pauseForEscalation) {
    logger.info("ROS Pipeline [Layer 9 - Escalation Intelligence]: AI Escalation triggered. Bypassing AI generation.", { intent: escalation.intent });
    const escalationLead = {
      ...defaultAiLeadInsight,
      score: escalation.urgency === 'High' ? 92 : 78,
      stage: 'Needs human',
      urgency: escalation.urgency,
      intent: escalation.label,
      summary: escalation.summary,
      signals: escalation.signals,
      missing: [],
      recommendedAction: escalation.recommendedAction,
      cta: 'Take over in inbox',
    };
    
    let escalationRos = applyRevenueOutcomeAction(
      applyRevenueStrategy(
        buildFallbackRevenueOperatingSnapshot({
          lead: escalationLead,
          cta: 'Take over in inbox',
          escalation,
        }),
        { latestText, escalation }
      ),
      await loadRevenueOutcomeProviderSettings({
        supabase,
        userId: user.id,
        metadataValue: metadata[revenueOutcomeProvidersMetadataKey],
      })
    );

    escalationRos = {
      ...escalationRos,
      buyerIntelligence: mergeBuyerIntelligenceProfiles(
        await loadRosProspectBuyerProfile({ supabase, userId: user.id, participant }),
        escalationRos.buyerIntelligence
      ),
      memory: mergeRevenueMemoryProfiles(
        (await loadRosProspectRevenueMemory({ supabase, userId: user.id, participant }))?.memory,
        escalationRos.memory
      ),
    };

    await persistRevenueOperatingSnapshot({
      supabase,
      userId: user.id,
      participant,
      conversationId,
      messages: messages as any,
      snapshot: escalationRos,
      escalation,
      source: 'ai_pipeline_escalation',
    });

    return {
      reply: escalation.reply,
      starter: '',
      cta: '',
      handoff: true,
      escalation,
      lead: escalationLead,
      ros: escalationRos,
      catalogOffer: null,
      catalogOffers: [],
      catalogCheckoutReady: false,
    };
  }

  // ==========================================
  // LAYER 1: CONVERSATION INTELLIGENCE
  // ==========================================
  logger.info("ROS Pipeline [Layer 1 - Conversation Intelligence]: Evaluating user inputs and buying/urgency signals.");
  const conversationLines = messages
    .slice(-16)
    .map(formatConversationLine)
    .join('\n');

  // ==========================================
  // LAYER 2: BUSINESS INTELLIGENCE
  // ==========================================
  logger.info("ROS Pipeline [Layer 2 - Business Intelligence]: Extracting catalog search criteria and fetching business context.");
  const catalogSearchText = buildCatalogSearchText(latestText, conversationLines);
  const freshCatalogCategoryRequest = isFreshCatalogCategoryRequest(latestText, conversationLines);
  const productCatalog = await getInstagramProductCatalogForUser(supabase, user.id).catch((catalogError) => {
    logger.warn('Instagram catalog unavailable during ROS Pipeline BI layer:', { error: catalogError });
    return [];
  });
  const catalogPrompt = formatCatalogForPrompt(productCatalog, catalogSearchText);
  const catalogDiscoveryRequired = isCatalogDiscoveryOnlyRequest(catalogSearchText);
  const catalogDiscoveryState = getCatalogDiscoveryState(catalogSearchText);
  const catalogOffers = findCatalogOffers(catalogSearchText, productCatalog);
  const catalogOffer = shouldUseSingleCatalogOffer(catalogSearchText, catalogOffers) ? catalogOffers[0] : null;

  // ==========================================
  // LAYER 3: BUYER INTELLIGENCE
  // ==========================================
  logger.info("ROS Pipeline [Layer 3 - Buyer Intelligence]: Resolving BANT profile facts and buyer goals.");
  const previousBuyerProfile = await loadRosProspectBuyerProfile({ supabase, userId: user.id, participant }).catch(() => null);
  const buyerMemoryPrompt = formatBuyerIntelligenceForPrompt(previousBuyerProfile);

  // ==========================================
  // LAYER 6: REVENUE MEMORY
  // ==========================================
  logger.info("ROS Pipeline [Layer 6 - Revenue Memory]: Accessing buyer history and previous objections.");
  const previousRevenueMemory = await loadRosProspectRevenueMemory({ supabase, userId: user.id, participant }).catch(() => null);
  const revenueMemoryPrompt = formatRevenueMemoryForPrompt(previousRevenueMemory);

  // ==========================================
  // LAYER 7: REVENUE LEARNING ENGINE
  // ==========================================
  logger.info("ROS Pipeline [Layer 7 - Revenue Learning Engine]: Ingesting strategy adaptations from historical conversions.");
  const revenueLearningPrompt = await formatRevenueLearningForPrompt({ supabase, userId: user.id }).catch(() => '');

  // ==========================================
  // LAYER 8: REVENUE OUTCOME INTELLIGENCE
  // ==========================================
  logger.info("ROS Pipeline [Layer 8 - Revenue Outcome Intelligence]: Fetching configured conversion parameters.");
  const outcomeProviders = await loadRevenueOutcomeProviderSettings({
    supabase,
    userId: user.id,
    metadataValue: metadata[revenueOutcomeProvidersMetadataKey],
  });

  const platformConfig = await resolvePlatformAiConfig(supabase);
  const integration = platformConfig.integration;
  const enabledWorkflows = getEnabledWorkflowMap(integration.workflows);
  const apiKey = platformConfig.apiKey;
  const assistantId = metadata.openai_assistant_id as string | undefined;

  if (!apiKey || !assistantId) {
    throw new Error("Missing OpenAI configuration (API Key or Assistant ID).");
  }

  const leadSchema = enabledWorkflows.qualifyLeads
    ? `"lead": {
    "score": 0-100,
    "stage": "New | Warm | Qualified | Ready for CTA | Needs human",
    "urgency": "Low | Medium | High",
    "intent": "short intent label",
    "summary": "one sentence",
    "signals": ["up to five buying or support signals"],
    "missing": ["up to five missing qualification facts"],
    "recommendedAction": "one next action for the business",
    "cta": "best CTA for this lead"
  }`
    : `"lead": null`;

  logger.info("ROS Pipeline [Layer 5 - Decision Intelligence]: Running OpenAI Assistant to process ROS layers.");
  const rawResult = await runAssistantThread({
    apiKey,
    assistantId,
    maxTokens: 2000,
    responseFormat: "json_object",
    additionalInstructions: `CRITICAL SYSTEM REQUIREMENT: You MUST respond with ONLY a valid JSON object. Do NOT write any plain text, prose, or conversational replies outside of the JSON structure. Your ENTIRE response must be a single valid JSON object starting with { and ending with }. If you return plain text instead of JSON, the system will break.

${integration.systemPrompt}

IMPORTANT: The attached files and vector store contain the primary truth for this business (such as menus, pricing, services, and policies). You MUST search these files using the file_search tool for any specific business inquiries (e.g. "menu", "pricing", "cost", "hours", "booking", or specific products/services). Do NOT rely on default prompts or assume the business context is TractionFlo if the knowledge base documents specify a different business (e.g. Taste Haven Restaurant). HOWEVER, you must absolutely WITHHOLD pricing, menus, and full features until the Buyer Intelligence layer (BANT) is fully complete.

${getAiBehaviorPrompt(integration.behavior)}

TractionFlo ROS™ (Revenue Operating System)

# Vision
TractionFlo ROS™ is an AI-powered Revenue Operating System designed to determine the highest probability next action that increases the likelihood of a successful business outcome. Unlike traditional chatbots that focus on answering questions, TractionFlo focuses on revenue outcomes. Its purpose is not simply to respond. Its purpose is to convert.

# Core Mission
Determine the highest-probability next action that increases the chance of a successful business outcome.

# Tone & Personality
1. You are an experienced human sales representative. You MUST sound 100% human. Never sound like an AI or a corporate bot.
2. Talk like a real person managing an Instagram DM. Keep replies brief, casual, and conversational. NEVER use robotic AI phrases like "Welcome to [Brand]!", "How can I assist you today?", or "Feel free to ask!".

# System Architecture (The 9 Intelligence Layers)

1. Conversation Intelligence
- Purpose: Understand what is happening inside the conversation.
- Tracks: User Intent, Questions, Objections, Sentiment, Emotional State, Buying Signals, Urgency Signals, Conversation Stage.
- Outcome: The AI understands the meaning behind the message instead of simply processing words.

2. Business Intelligence
- Purpose: Understand the business being represented.
- Learns: Products, Services, Pricing, FAQs, Guarantees, Policies, Brand Voice, Success Stories, Offers.
- Outcome: Every response stays aligned with the business.

3. Buyer Intelligence
- Purpose: Build a live profile of every prospect.
- Learns: Goals, Problems, Budget, Authority, Need, Timeline, Behavior, Purchase Readiness.
- Outcome: The AI understands who it is selling to.

4. Revenue Intelligence
- Purpose: Act as the sales brain of the system.
- Powered By: SPIN Selling, Challenger Sale, MEDDIC, BANT, Gap Selling, Consultative Selling, LAER, Jobs To Be Done.
- Responsibilities: Determine what should be asked, explained, which objection exists, and how to move the deal forward.
- Outcome: Every conversation follows proven sales methodologies.

5. Decision Intelligence
- Purpose: Act as the orchestration engine.
- Inputs: All previous layers.
- Outcome: The system does not simply understand. It decides.

6. Revenue Memory
- Purpose: Remember the complete customer relationship.
- Stores: Conversation History, Objections, Questions Asked, Offers Presented, Purchases, Preferences, Follow-up History.
- Outcome: Every interaction becomes cumulative.

7. Revenue Learning Engine
- Purpose: Continuously improve performance.
- Tracks: Winning Conversations, Lost Opportunities, Objections, Successful Follow-Ups, Conversion Patterns, Revenue Drivers.
- Outcome: The platform becomes smarter over time.

8. Revenue Outcome Intelligence
- Purpose: Optimize for business outcomes.
- Core Question: What outcome should we pursue next? (Follow Creator, Join Newsletter, Book Call, Start Trial, Purchase Product, Upgrade Plan, Recover Abandoned Cart, Renew Subscription, Collect Testimonial).
- Outcome: TractionFlo focuses on business progress rather than conversation engagement.

9. Escalation Intelligence
- Purpose: Know when AI should stop and escalate to human.

# Complete Processing Flow
Customer Message -> Conversation Intelligence -> Business Intelligence -> Buyer Intelligence -> Revenue Intelligence -> Revenue Memory -> Revenue Learning Engine -> Revenue Outcome Intelligence -> Decision Intelligence -> Response Generation -> Escalation Intelligence

# STRICT LAYER-BASED PROGRESSION RULES
- Greeting Layer: If a user only says "Hi" or a generic greeting, process ONLY the Greeting Layer. Respond naturally like a human salesperson (e.g., "Hey!"). Do NOT ask unnecessary questions or show products.
- Buyer Intelligence / Discovery Layer: If the user asks "What are you selling?" or expresses initial interest, classify it under this layer. Follow only the rules, objectives, and discovery questions defined for qualification.
- Product Recommendation & Pricing Layers: DO NOT jump to Product Recommendation, Pricing, or Closing layers until the previous layers (Greeting and Discovery) have been completed.
- STAY IN YOUR LAYER: Every layer contains its own logic, questions, and expected outputs. You must stay within that layer until enough information is collected to move to the next one.
- NO ASSUMPTIONS: Never guess customer intent, never assume buying interest, and never recommend products or send menus before understanding the customer's requirements.
- SINGLE-MESSAGE FOCUS: Progress one layer at a time. Do NOT act like an AI assistant that tries to answer everything, pitch products, and close the deal in a single message.

# Final Mission
Determine the highest-probability next action that increases the chance of a successful business outcome. Not a chatbot. Not a support bot. Not an autoresponder. A Revenue Operating System.

Lead qualification rules: ${integration.leadQualificationRules}
${getConditionalCtaPrompt(integration.ctaMessage, latestText)}

Auto-detected Instagram product catalog:
${catalogPrompt || 'No relevant catalog product was detected for this conversation.'}

Product discovery status: ${catalogDiscoveryRequired ? 'needs_questions' : 'ready_or_not_needed'}
- The Instagram product catalog above is the source of truth for currently loaded posts/products. If it lists a category or product, do not contradict it using older conversation context or general business assumptions.
- New product category inquiry: ${freshCatalogCategoryRequest ? 'yes' : 'no'}
- If new product category inquiry is yes, answer only the latest category question. Do not continue, confirm, re-show, or send checkout/payment steps for any previous order.
- If new product category inquiry is yes and no relevant catalog product was detected, say that no matching option is currently available in the catalog/knowledge instead of offering the previous product.
- If relevant catalog products are listed for a new product category inquiry, say they are available and answer from those products. Do not say the category is unavailable.
- For availability or browse questions, do not ask for checkout or order confirmation unless the customer explicitly chooses a product and confirms purchase intent.
- If product discovery status is needs_questions, the reply must ask consultative discovery questions before any product offer.
- Do not present catalog items, checkout, confirm-order language, or pricing cards yet.
- Only ask for missing core details: budget and product goal/desired item/use-case.
- Known core details: budget=${catalogDiscoveryState.hasBudget ? 'yes' : 'no'}, product_goal=${catalogDiscoveryState.hasGoal ? 'yes' : 'no'}.
- Once budget and product goal are known, stop asking more discovery questions and show the best matching product option.
- Do NOT present pricing, full product features, or menus unless Buyer Intelligence is fully complete. If asked "what are you selling", briefly mention the category and immediately ask a discovery question.

Configured revenue outcome providers:
${formatRevenueOutcomeProvidersForPrompt(outcomeProviders) || 'No external outcome provider links are configured yet. If the right outcome needs a provider link, ask for contact/consent or use a manual next step.'}

Creator-specific revenue learning:
${revenueLearningPrompt || 'No creator-specific learning is available yet. Use the default ROS strategy and persist the decision for future learning.'}

Saved buyer memory for this Instagram participant:
${buyerMemoryPrompt}

Buyer memory rules:
- Treat saved buyer memory as known context for this same participant.
- Preserve known goal, problem, budget, authority, need, and timeline unless the latest conversation clearly corrects them.
- Return buyerIntelligence as the merged live buyer profile across all interactions, not only facts from the latest message.

Saved revenue memory for this Instagram participant:
${revenueMemoryPrompt}

Revenue memory rules:
- Treat saved revenue memory as the cumulative customer relationship.
- Remember previous objections, questions asked, offers presented, purchases, and follow-up history.
- Do not restart discovery or repeat an already-presented offer unless the latest message makes that useful.
- Return memory as the merged relationship memory across all interactions.

Return only valid JSON. No markdown. No commentary.
Never ask again for booking details that the customer already gave earlier in the conversation.
Always include a "ros" object. The ROS object is the Revenue Operating System decision layer and must choose the highest-probability next action that advances a business outcome.
Track tacticIntelligence with stable snake_case tactic names, including the ordered tactic sequence and which tactics happened before pricing. Useful tactic names include ask_budget, ask_timeline, ask_authority, diagnose_need, show_case_study, use_social_proof, state_guarantee, handle_price_objection, present_pricing, present_offer, offer_checkout, offer_booking, smaller_next_step, human_handoff, and follow_up.
JSON shape:
{
  "starter": "first response to send when AI Starts Conversation is on and this is a new inbound lead; empty when not needed",
  "reply": "best next answer to the latest user message; NEVER include prices, menus, or full product features unless Buyer Intelligence (BANT) is complete; be brief and conversational",
  "cta": "short CTA message that moves a ready lead forward",
  ${leadSchema},
  "ros": {
    "conversationIntelligence": {
      "intent": "short intent label",
      "sentiment": "positive | neutral | negative | mixed",
      "emotion": "curious | hesitant | ready | frustrated | unknown",
      "objection": "cost | trust | timing | fit | none",
      "buyingSignal": "detected buying signal or empty string",
      "urgencySignal": "detected urgency signal or empty string",
      "stage": "new | awareness | consideration | qualified | ready_for_cta | needs_human",
      "questions": ["questions the user asked"],
      "signals": ["up to five important conversation signals"]
    },
    "buyerIntelligence": {
      "goal": "known goal or empty string",
      "problem": "known problem or empty string",
      "budget": "known budget or empty string",
      "authority": "known authority or empty string",
      "need": "known need or empty string",
      "timeline": "known timeline or empty string",
      "behavior": "short behavior summary",
      "readiness": "low | medium | high",
      "missing": ["missing qualification facts"]
    },
    "revenueIntelligence": {
      "framework": "BANT, SPIN, MEDDIC, consultative selling, or other useful framework",
      "method": "ask | explain | handle_objection | present_offer | escalate | follow_up",
      "nextQuestion": "one qualification question if needed",
      "objection": "current objection or empty string",
      "salesStage": "current revenue stage",
      "recommendation": "specific next action for the business"
    },
    "tacticIntelligence": {
      "tactics": ["stable snake_case tactics used or recommended"],
      "sequence": ["ordered stable snake_case tactic names"],
      "primaryTactic": "single main tactic",
      "usedBeforePricing": ["tactics used before present_pricing"],
      "pricingPresented": true
    },
    "outcomeProbabilities": {
      "follow_creator": 0-100,
      "join_newsletter": 0-100,
      "book_call": 0-100,
      "start_trial": 0-100,
      "purchase_product": 0-100,
      "upgrade_plan": 0-100,
      "recover_abandoned_cart": 0-100,
      "renew_subscription": 0-100,
      "collect_testimonial": 0-100
    },
    "decision": {
      "bestNextAction": "single best next action",
      "confidence": 0-100,
      "rationale": "short reason for this decision"
    },
    "memory": {
      "objections": ["objections to remember"],
      "questionsAsked": ["important questions already asked"],
      "offersPresented": ["offers or CTAs already presented"],
      "followUpNeeded": true
    }
  }
}`,
    messages: [
      {
        role: 'user',
        content: `Instagram participant: ${participant.username || participant.name || 'this Instagram lead'}
Recent conversation:
${conversationLines || 'No prior messages.'}

CRITICAL FINAL INSTRUCTIONS BEFORE WRITING YOUR REPLY:
1. Check the Saved Buyer Memory. Have you collected all core BANT facts (Budget, Authority, Need, Timeline, Goal)?
2. If BANT is NOT fully complete, you are strictly in Layer 3 (Buyer Intelligence). You are FORBIDDEN from presenting product features, full menus, or pricing.
3. If the user asks "what are you selling", "how much is it", or similar, briefly state the category (e.g., "We offer AI courses") and IMMEDIATELY ask a discovery question to collect a missing BANT fact.
4. Do not send walls of text or bulleted lists of features until Layer 3 is complete. Be conversational, human, and brief (1-2 short sentences max).

5. IGNORE any past mistakes in the conversation history. Even if you previously revealed the price ($79, $299) or course features, DO NOT repeat them now. You must act as if you haven't mentioned them yet.
6. YOU WILL BE SEVERELY PENALIZED if you mention $79, $299, or list out course features in your reply before collecting ALL 5 BANT facts.

Write the next best reply adhering strictly to the Layer progression rules.`,
      },
    ],
  });

  const parsed = extractJsonObject(rawResult);
  let lead = normalizeLeadInsight(parsed.lead);
  let reply = normalizeText(parsed.reply, '', 500);
  let starter = normalizeText(parsed.starter, '', 500);
  let cta = normalizeText(parsed.cta, lead.cta, 500);

  // ==========================================
  // HARD-CODED BANT GUARD — Scans ACTUAL user messages, NOT the AI's
  // self-reported buyerIntelligence. The AI lies about BANT completeness
  // by inferring values the user never explicitly stated. This guard
  // checks what the USER actually said and blocks pricing/features
  // until real qualification has happened.
  // ==========================================
  {
    const userMessages = messages
      .filter(m => m.from === 'user')
      .map(m => (m.text || '').toLowerCase())
      .join(' ');
    const userMsgCount = messages.filter(m => m.from === 'user').length;

    // Check if the USER (not the AI) has explicitly provided BANT signals
    const userMentionedBudget = /\$\d+|\d+\s*(?:dollars|usd)|budget|afford|spend|invest|pay|willing to pay|price range/i.test(userMessages);
    const userMentionedTimeline = /\b(this week|this month|today|tomorrow|asap|urgent|soon|next month|next week|start|by |deadline|right away|immediately|before|within)\b/i.test(userMessages);
    const userMentionedNeedOrGoal = /\b(i need|i want|looking for|my goal|career|job|freelanc|business|problem|struggling|learn|improve|automat|build|create|side hustle|income|skill)\b/i.test(userMessages);
    const userMentionedAuthority = /\b(i decide|my decision|i.m the|team|boss|manager|company|we need|our)\b/i.test(userMessages);

    const bantSignalCount = [userMentionedBudget, userMentionedTimeline, userMentionedNeedOrGoal, userMentionedAuthority].filter(Boolean).length;

    // BANT is only "real" if the user has provided at least 3 explicit signals
    // OR if there have been enough back-and-forth turns (at least 5 user messages)
    const bantReallyComplete = bantSignalCount >= 3 || (userMsgCount >= 5 && bantSignalCount >= 2);

    if (!bantReallyComplete) {
      const hasPricing = /\$\d+|\d+\s*(?:dollars|USD|usd)/i.test(reply);
      const hasFeatureDump = /(?:[-•]\s*.+\n?){3,}/m.test(reply) || reply.length > 280;

      if (hasPricing || hasFeatureDump) {
        logger.info('ROS Pipeline [BANT GUARD]: BLOCKED pricing/feature dump. User has NOT provided enough BANT signals.', {
          userMsgCount,
          bantSignalCount,
          userMentionedBudget,
          userMentionedTimeline,
          userMentionedNeedOrGoal,
          userMentionedAuthority,
          originalReplyPreview: reply.slice(0, 100),
          hasPricing,
          hasFeatureDump,
        });

        // Pick the right qualifying question based on what's missing
        const missingBant: string[] = [];
        if (!userMentionedNeedOrGoal) missingBant.push('goal');
        if (!userMentionedBudget) missingBant.push('budget');
        if (!userMentionedTimeline) missingBant.push('timeline');
        if (!userMentionedAuthority) missingBant.push('authority');

        const qualifyingQuestions: Record<string, string> = {
          goal: "What's your main goal — are you looking to pick up new skills for a career switch, or more to level up in your current role?",
          budget: "What kind of budget are you working with for something like this?",
          timeline: "Are you looking to jump in soon, or is this more of a down-the-road thing?",
          authority: "Would you be making this call yourself, or is someone else involved in the decision?",
        };

        const firstMissing = missingBant[0] || 'goal';
        reply = `Yeah we've got some great stuff in the AI and automation space! ${qualifyingQuestions[firstMissing]}`;
      }
    }
  }

  // ==========================================
  // LAYER 4: REVENUE INTELLIGENCE (Post-Run Frameworks)
  // ==========================================
  logger.info("ROS Pipeline [Layer 4 - Revenue Intelligence]: Integrating outcome probabilities and frameworks.");
  const normalizedRos = normalizeRevenueOperatingSnapshot(
    parsed.ros ?? (parsed as any).revenue_operating_system,
    buildFallbackRevenueOperatingSnapshot({ lead, cta, escalation: null })
  );

  const rosWithBuyerMemory = {
    ...normalizedRos,
    buyerIntelligence: mergeBuyerIntelligenceProfiles(previousBuyerProfile, normalizedRos.buyerIntelligence),
    memory: mergeRevenueMemoryProfiles(previousRevenueMemory?.memory, normalizedRos.memory),
  };

  logger.info("ROS Pipeline [Layer 5 - Decision Intelligence]: Resolving final strategy decision and outcome logic.");
  const finalRos = applyRevenueOutcomeAction(
    applyRevenueStrategy(
      rosWithBuyerMemory,
      {
        latestText,
        hasCatalogOffer: Boolean(catalogOffer),
        escalation: null,
      }
    ),
    outcomeProviders
  );

  const calculateLayerStatuses = (
    ros: RevenueOperatingSnapshot,
    hasCatalogOffer: boolean,
    hasCatalogContext: boolean
  ): RevenueOperatingSnapshot["layerStatuses"] => {
    const isFilled = (val: any) => typeof val === "string" && val.trim().length > 0 && val.toLowerCase() !== "unknown" && val.toLowerCase() !== "none";
    
    const isGreeting = ros.conversationIntelligence.intent?.toLowerCase().includes("greeting");

    const l1Complete = !isGreeting && isFilled(ros.conversationIntelligence.intent) && isFilled(ros.conversationIntelligence.sentiment);
    const l2Complete = l1Complete && (hasCatalogOffer || hasCatalogContext);
    
    const bi = ros.buyerIntelligence;
    const bantFilled = isFilled(bi.budget) && isFilled(bi.authority) && isFilled(bi.need) && isFilled(bi.timeline) && isFilled(bi.goal);
    const l3Complete = l2Complete && bantFilled;
    
    const l4Complete = l3Complete && isFilled(ros.revenueIntelligence.recommendation);
    const l5Complete = l4Complete && isFilled(ros.decision.bestNextAction);
    const l6Complete = l5Complete; // memory happens automatically if previous is done
    const l7Complete = l6Complete && ros.tacticIntelligence.tactics.length > 0;
    const l8Complete = l7Complete && Object.keys(ros.outcomeProbabilities).length > 0;
    const l9Complete = l8Complete; // escalation check

    return {
      layer1: l1Complete ? "completed" : "in_progress",
      layer2: !l1Complete ? "pending" : l2Complete ? "completed" : "in_progress",
      layer3: !l2Complete ? "pending" : l3Complete ? "completed" : "in_progress",
      layer4: !l3Complete ? "pending" : l4Complete ? "completed" : "in_progress",
      layer5: !l4Complete ? "pending" : l5Complete ? "completed" : "in_progress",
      layer6: !l5Complete ? "pending" : l6Complete ? "completed" : "in_progress",
      layer7: !l6Complete ? "pending" : l7Complete ? "completed" : "in_progress",
      layer8: !l7Complete ? "pending" : l8Complete ? "completed" : "in_progress",
      layer9: !l8Complete ? "pending" : l9Complete ? "completed" : "in_progress",
    };
  };

  finalRos.layerStatuses = calculateLayerStatuses(finalRos, Boolean(catalogOffer), productCatalog.length > 0);

  // Guard CTAs and catalog overlays
  starter = removeUnrequestedBookingCta(starter, latestText);
  reply = removeUnrequestedBookingCta(reply, latestText);
  cta = removeUnrequestedBookingCta(cta, latestText);

  const catalogCheckoutReady = catalogDiscoveryState.ready;
  const checkoutCatalogOffer = catalogCheckoutReady ? catalogOffer : null;

  if (checkoutCatalogOffer) {
    reply = buildCatalogOfferReply(reply, checkoutCatalogOffer);
    starter = buildCatalogOfferReply(starter, checkoutCatalogOffer);
    cta = buildCatalogOfferReply(cta, checkoutCatalogOffer);
  }

  // ==========================================
  // LAYER 6: REVENUE MEMORY (Post-Run Persistence)
  // ==========================================
  logger.info("ROS Pipeline [Layer 6 - Revenue Memory]: Persisting unified 9-layer ROS snapshot.");
  await persistRevenueOperatingSnapshot({
    supabase,
    userId: user.id,
    participant,
    conversationId,
    messages: messages as any,
    snapshot: finalRos,
    escalation: null,
    outcomeProviders,
    source: 'ai_pipeline_ros',
    reply,
    starter,
    lead,
  });

  return {
    reply,
    starter,
    cta,
    handoff: false,
    escalation: null,
    lead,
    ros: finalRos,
    catalogOffer: checkoutCatalogOffer,
    catalogOffers,
    catalogCheckoutReady,
  };
}
