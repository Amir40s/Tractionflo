import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, RefreshCw } from "lucide-react";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export function KnowledgeAssistantChat({ onSourcesSaved }: { onSourcesSaved: () => void }) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi! I'm your Knowledge Assistant. Paste any text, URLs, or information about your business, and I'll automatically categorize it for you!" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function handleSend() {
    if (!input.trim()) return;

    let textToSend = input.trim();
    const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9-]+\.(com|org|net|io|ai|co|app)[^\s]*)/i;
    const urlMatch = textToSend.match(urlRegex);
    let urlToScrape = urlMatch ? urlMatch[0] : null;
    if (urlToScrape && !urlToScrape.startsWith('http')) {
      urlToScrape = 'https://' + urlToScrape;
    }
    
    const userMessage: Message = { role: "user", content: textToSend };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      if (urlToScrape) {
        setMessages((prev) => [...prev, { role: "system", content: `Scraping ${urlToScrape}...` }]);
        const scrapeRes = await fetch("/api/knowledge/sources/scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: urlToScrape })
        });
        const scrapeData = await scrapeRes.json();
        if (scrapeData.text) {
          textToSend = `${textToSend}\n\n[Scraped content from ${urlToScrape}]:\n${scrapeData.text.slice(0, 8000)}`;
          // Remove the temporary "Scraping website..." message
          setMessages((prev) => prev.filter(m => !m.content.startsWith("Scraping ")));
        }
      }

      const backendMessage = { role: "user", content: textToSend };

      const response = await fetch("/api/knowledge/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages.filter(m => m.role !== "system"), backendMessage] })
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      const assistantMsg = data.message;
      
      // Check if tool was called
      let knowledgeSaved = false;
      if (assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0) {
        for (const call of assistantMsg.tool_calls) {
          if (call.function.name === "save_knowledge_chunks") {
            const args = JSON.parse(call.function.arguments);
            for (const chunk of args.chunks) {
              await fetch("/api/knowledge/sources", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  category: chunk.category,
                  title: chunk.title,
                  content: chunk.content,
                  assignment: "default"
                })
              });
              knowledgeSaved = true;
            }
          }
        }
      }

      let fallbackText = "Got it! Is there anything else you'd like to add or categorize?";
      if (knowledgeSaved) {
        fallbackText = "I've successfully saved that information to your knowledge base! What else can I help you add?";
      } else if (!assistantMsg.tool_calls || assistantMsg.tool_calls.length === 0) {
        fallbackText = "Hmm, I didn't find any specific business details to save there. Could you provide more details about your products, services, pricing, or FAQs?";
      }

      setMessages((prev) => [...prev, { role: "assistant", content: assistantMsg.content || fallbackText }]);

      if (knowledgeSaved) {
        onSourcesSaved();
      }

    } catch (err) {
      console.error(err);
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I encountered an error processing that." }]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex w-full flex-col overflow-hidden rounded-[10px] border border-[#e7eaf2] bg-white shadow-[0_18px_45px_rgba(20,28,53,0.025)]">
      <div className="border-b border-[#e7eaf2] bg-[#f8f9fc] px-4 py-3">
        <h3 className="flex items-center gap-2 text-[14px] font-extrabold text-black">
          <Bot size={18} className="text-[#3044ff]" />
          Knowledge Assistant
        </h3>
        <p className="mt-1 text-[11px] font-medium text-[#596175]">
          Chat with me to easily categorize and build your AI's knowledge base.
        </p>
      </div>

      <div ref={scrollRef} className="flex h-[300px] flex-col gap-4 overflow-y-auto p-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`flex max-w-[80%] gap-3 rounded-[12px] p-3 text-[13px] leading-relaxed ${msg.role === "user" ? "bg-[#3044ff] text-white" : "bg-[#f4f5f8] text-[#111827]"}`}>
              <div className="min-w-0 flex-1 whitespace-pre-wrap">{msg.content}</div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex w-full justify-start">
            <div className="flex items-center gap-2 rounded-[12px] bg-[#f4f5f8] px-4 py-3 text-[13px] text-[#596175]">
              <RefreshCw size={14} className="animate-spin" /> Thinking...
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-[#e7eaf2] bg-white p-3">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            placeholder="Type or paste your information here..."
            className="max-h-[120px] min-h-[40px] w-full resize-y rounded-[8px] border border-[#dde3ee] bg-[#fdfdff] p-2.5 text-[13px] text-black outline-none placeholder:text-[#9aa1b5] focus:border-[#3044ff]"
            rows={1}
          />
          <button
            onClick={() => void handleSend()}
            disabled={!input.trim() || isLoading}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-[#3044ff] text-white transition hover:bg-[#1a2df5] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
