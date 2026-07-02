import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/utils/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { listKnowledgeSourceIndexes } from "@/lib/knowledge-base";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Messages array is required." }, { status: 400 });
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const supabaseAdmin = createSupabaseServiceClient();
    const existingSources = await listKnowledgeSourceIndexes(supabaseAdmin, user.id);
    
    // Create a summary of what we already know
    let knownInfoStr = "The user has not added any information to their knowledge base yet.";
    if (existingSources.length > 0) {
      const categoriesSummary = existingSources.reduce((acc, source) => {
        source.categories.forEach(cat => {
          if (!acc[cat]) acc[cat] = [];
          acc[cat].push(source.title);
        });
        return acc;
      }, {} as Record<string, string[]>);

      knownInfoStr = "The user ALREADY has the following information in their knowledge base:\n";
      Object.entries(categoriesSummary).forEach(([cat, titles]) => {
        knownInfoStr += `- ${cat}: ${titles.join(', ')}\n`;
      });
    }

    const systemPrompt = `You are an expert Onboarding Assistant for TractionFlo. 
Your ultimate goal is to gather a COMPLETE knowledge base so that our AI chatbot can flawlessly answer ANY question a customer might have about the user's business.

Here is what you ALREADY know about the user's business based on their existing knowledge base:
${knownInfoStr}

The available categories you can save information to are:
- "Business Information"
- "Products"
- "Services"
- "Pricing"
- "FAQs"

When the user provides information (either typed out or scraped from a website), you must:
1. Extract the specific facts, products, services, or FAQs.
2. Call the 'save_knowledge_chunks' tool to save the categorized information.
3. Respond to the user confirming what was saved. 
4. CRITICAL: Analyze what you ALREADY know vs what a chatbot needs to succeed. Identify what crucial information is still missing (e.g. if they have products but no pricing, or if they have pricing but no FAQs like refund policies). Proactively ask the user to provide that specific missing information so the chatbot is fully prepared.

Make your responses concise, conversational, and highly proactive. Act like a consultant ensuring their chatbot won't fail. Ask one targeted question at a time.
NEVER say "I cannot access external websites directly" or similar phrases. The system automatically scrapes any URLs the user provides and feeds you the raw text behind the scenes. Treat the provided text as if you read the website yourself.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "save_knowledge_chunks",
            description: "Saves one or more categorized chunks of information to the knowledge base.",
            parameters: {
              type: "object",
              properties: {
                chunks: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      category: {
                        type: "string",
                        enum: ["Business Information", "Products", "Services", "Pricing", "FAQs"],
                        description: "The category for this piece of knowledge."
                      },
                      title: {
                        type: "string",
                        description: "A short, descriptive title for this knowledge chunk (e.g. 'Standard Plan Pricing' or 'Refund Policy FAQ')."
                      },
                      content: {
                        type: "string",
                        description: "The detailed information or content. Must be at least 10 characters long."
                      }
                    },
                    required: ["category", "title", "content"]
                  }
                }
              },
              required: ["chunks"]
            }
          }
        }
      ],
      tool_choice: "auto",
    });

    const choice = response.choices[0];
    const assistantMessage = choice.message;

    return NextResponse.json({ message: assistantMessage });
  } catch (error) {
    console.error("Error in knowledge assistant API:", error);
    return NextResponse.json({ error: "Could not process request." }, { status: 500 });
  }
}
