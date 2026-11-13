import React, { useState, useRef, useEffect } from 'react';
import { AssistantMessage } from '../types/travel';
import { Send, Sparkles, User, Bot, RefreshCw, Compass, MapPin } from 'lucide-react';

interface AIAssistantChatProps {
  onSelectDestinationByName?: (name: string) => void;
  tripContextSummary?: string;
}

const STARTER_PROMPTS = [
  'How much does travel cost by Uber vs Rapido across my route?',
  'Plan a 3-day cultural & food itinerary from my origin.',
  'What are the best sunset viewpoints and entry timings?',
  'Suggest budget-friendly local food spots and iconic dishes.',
  'How should I adjust my itinerary if rain is forecast this afternoon?',
];

export const AIAssistantChat: React.FC<AIAssistantChatProps> = ({
  onSelectDestinationByName,
  tripContextSummary,
}) => {
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Welcome to AI-TRAVELMATE Concierge! I am grounded with your active trip context, live weather forecasts, admission fees, and multi-modal transit estimates. Ask me anything to plan, refine, or optimize your journey.',
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isLoading) return;

    const userMsg: AssistantMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          tripContext: tripContextSummary || 'Worldwide travel exploration',
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const assistantMsg: AssistantMessage = {
          id: `bot-${Date.now()}`,
          sender: 'assistant',
          text: data.reply,
          timestamp: new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          groundedDestinations: data.groundedDestinations,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        throw new Error(data.error?.message || 'Failed to get AI response');
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      const errorMsg: AssistantMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: 'I am temporarily experiencing connection latency with the Gemini service. You can continue using destination search, interactive routing, live weather forecasts, and the trip planner directly.',
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-[#E8EAF2] shadow-[0_12px_40px_-12px_rgba(16,24,40,0.08)] flex flex-col h-[680px] overflow-hidden">
      {/* Midnight Navy & Electric Violet AI Concierge Header */}
      <div className="bg-hero-midnight text-white p-5 sm:p-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-brand-gradient text-white flex items-center justify-center shadow-lg shadow-[#5145E5]/30 shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#14B8A6]">
                Intelligent Travel Companion
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#14B8A6] animate-pulse" />
            </div>
            <h3 className="font-display text-base sm:text-lg font-black text-white leading-tight">
              AI Travel Advisor &amp; Route Concierge
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Grounded with live coordinates, entry tickets &amp; real-time weather
            </p>
          </div>
        </div>
        <span className="hidden sm:inline-flex text-[11px] font-mono font-bold text-white/90 bg-white/10 px-3 py-1 rounded-full border border-white/15">
          Gemini 3.8 Flash
        </span>
      </div>

      {/* Message Stream */}
      <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-[#F7F8FC]">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-[88%] sm:max-w-[80%] ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
                }`}
            >
              <div
                className={`w-8 h-8 rounded-2xl flex items-center justify-center shrink-0 text-xs font-bold shadow-xs ${isUser ? 'bg-[#101828] text-white' : 'bg-brand-gradient text-white'
                  }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${isUser
                    ? 'bg-[#101828] text-white rounded-tr-xs shadow-md'
                    : 'bg-white border border-[#E8EAF2] text-[#101828] rounded-tl-xs shadow-xs'
                  }`}
              >
                <div className="whitespace-pre-line">{msg.text}</div>

                {/* Grounded destination pills if any */}
                {msg.groundedDestinations && msg.groundedDestinations.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-[#E8EAF2] flex flex-wrap gap-1.5 items-center">
                    <span className="text-[10px] text-[#64748B] font-bold uppercase flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#5145E5]" />
                      <span>Explore Mentioned:</span>
                    </span>
                    {msg.groundedDestinations.map((dName, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() =>
                          onSelectDestinationByName && onSelectDestinationByName(dName)
                        }
                        className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#5145E5]/10 text-[#5145E5] hover:bg-[#5145E5] hover:text-white font-bold transition-colors cursor-pointer"
                      >
                        {dName}
                      </button>
                    ))}
                  </div>
                )}

                <div
                  className={`text-[10px] mt-2 font-mono text-right ${isUser ? 'text-slate-400' : 'text-[#64748B]'
                    }`}
                >
                  {msg.timestamp}
                </div>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex gap-3 max-w-[80%] mr-auto">
            <div className="w-8 h-8 rounded-2xl bg-brand-gradient text-white flex items-center justify-center shrink-0 shadow-xs">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-4 bg-white border border-[#E8EAF2] rounded-2xl rounded-tl-xs text-xs text-[#101828] flex items-center gap-2.5 shadow-xs">
              <RefreshCw className="w-4 h-4 animate-spin text-[#5145E5]" />
              <span className="font-semibold">Synthesizing personalized travel guidance...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Starter Prompts */}
      <div className="px-4 pt-3 pb-2 border-t border-[#E8EAF2] bg-white">
        <span className="text-[10px] uppercase font-extrabold tracking-wider text-[#64748B] flex items-center gap-1.5 mb-2">
          <Compass className="w-3 h-3 text-[#5145E5]" />
          <span>Suggested Travel Prompts</span>
        </span>
        <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-none">
          {STARTER_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendMessage(prompt)}
              className="text-xs font-semibold whitespace-nowrap bg-[#F7F8FC] hover:bg-[#5145E5]/10 hover:text-[#5145E5] hover:border-[#5145E5]/30 border border-[#E8EAF2] rounded-xl px-3 py-1.5 text-[#101828] transition-all cursor-pointer"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="p-4 bg-white border-t border-[#E8EAF2] flex items-center gap-2.5"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ask about destinations, local cuisine, timings, weather, or routes..."
          className="flex-1 bg-[#F7F8FC] border border-[#E8EAF2] rounded-2xl px-4 py-3 text-xs sm:text-sm text-[#101828] placeholder:text-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#5145E5]/20 focus:border-[#5145E5] focus:bg-white transition-all"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isLoading}
          className="px-5 py-3 bg-brand-gradient disabled:opacity-40 text-white rounded-2xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 shadow-md shadow-[#5145E5]/25 cursor-pointer"
        >
          <span>Send</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
