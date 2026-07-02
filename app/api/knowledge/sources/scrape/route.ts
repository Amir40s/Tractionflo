import { NextResponse } from "next/server";
import { canAccessPage, getUserPermissionProfile } from "@/lib/agent-permissions";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const authSupabase = await createClient();
    const {
      data: { user },
      error,
    } = await authSupabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const permissions = getUserPermissionProfile((user.user_metadata || {}) as Record<string, unknown>);
    if (!canAccessPage(permissions, "knowledge")) {
      return NextResponse.json({ error: "Knowledge Base is not enabled for this account." }, { status: 403 });
    }

    const { url } = await request.json().catch(() => ({ url: "" }));
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    let html = "";
     try {
      const rawResponse = await fetch(url, {
        signal: controller.signal,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; TractionFloBot/1.0)" }
      });
      if (rawResponse.ok) {
        const rawHtml = await rawResponse.text();
         if (rawHtml.length > 2000 && !rawHtml.includes('<noscript>You need to enable JavaScript')) {
          html = rawHtml;
        }
      }
    } catch (e) {
      console.warn("Raw fetch failed, falling back to Jina AI", e);
    }

     if (!html) {
      const jinaResponse = await fetch(`https://r.jina.ai/${url}`, {
        signal: controller.signal,
        headers: {
          'Accept': 'text/plain',
          'X-Return-Format': 'html',
          'X-Target-Selector': 'body'
        }
      });
      if (!jinaResponse.ok) {
        clearTimeout(timeoutId);
        return NextResponse.json({ error: `Failed to scrape website: ${jinaResponse.statusText}` }, { status: 400 });
      }
      html = await jinaResponse.text();
    }

    clearTimeout(timeoutId);
    const cheerio = await import("cheerio");
    const $ = cheerio.load(html);
    let hiddenFaqContent = "";
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const data = JSON.parse($(el).html() || "{}");
        if (data['@type'] === 'FAQPage' && Array.isArray(data.mainEntity)) {
          hiddenFaqContent += "\n\n## Frequently Asked Questions\n";
          data.mainEntity.forEach((item: any) => {
            if (item['@type'] === 'Question' && item.name && item.acceptedAnswer?.text) {
              hiddenFaqContent += `**Q: ${item.name}**\nA: ${item.acceptedAnswer.text}\n\n`;
            }
          });
        }
      } catch (e) {}
    });

    $('script, style, svg, noscript, iframe, nav, footer, header').remove();
    
    const rawText = $('body').text();
    let markdown = rawText.replace(/[ \t]+/g, ' ').replace(/\n\s*\n/g, '\n\n').trim();

    if (hiddenFaqContent) {
      markdown += hiddenFaqContent;
    }

    return NextResponse.json({ text: markdown });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not scrape website";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
