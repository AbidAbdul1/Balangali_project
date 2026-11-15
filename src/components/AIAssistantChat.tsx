import React, { useState, useRef, useEffect } from 'react';
import { AssistantMessage } from '../types/travel';
import { Send, MapPin, Sparkles, Loader2 } from 'lucide-react';

interface AIAssistantChatProps {
  onSelectDestinationByName?: (name: string) => void;
  tripContextSummary?: string;
}

const STARTER_PROMPTS = [
  'Compare cab vs bike transit cost across my stops',
  'Plan a 3-day cultural & food route from my starting city',
  'Best sunset viewpoints & quieter visiting hours',
  'Budget-friendly local dishes & dining streets',
  'Adjust afternoon outdoor stops if rain arrives',
];

export const AIAssistantChat: React.FC<AIAssistantChatProps> = ({
  onSelectDestinationByName,
  tripContextSummary,
}) => {
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Hello! I am your Travel Advisor, grounded with your active destination, weather forecast, admission costs, and transit estimates. Ask me anything to refine your journey.',
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
          id: `assistant-${Date.now()}`,
          sender: 'assistant',
          text: data.reply,
          timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          groundedDestinations: data.groundedDestinations,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        throw new Error(data.error?.message || 'Unable to reach Travel Advisor');
      }
    } catch {
      const errMsg: AssistantMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: 'I could not reach the advisor service right now. Please try your question again in a moment.',
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="flex flex-col border-t border-[#E6E2D8] pt-6">
      <div className="pb-4 border-b border-[#E6E2D8] flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.15em] text-[#91A995]">
            AI Travel Advisor
          </p>
          <h2 className="font-display text-2xl font-semibold text-[#343A36] mt-0.5">
            Ask about routes, timing &amp; local tips
          </h2>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs text-[#243C32] font-medium">
          <Sparkles className="w-3.5 h-3.5 text-[#D68B65]" />
          Trip context linked
        </span>
      </div>

      {/* Starter Prompt Links */}
      <div className="py-3 border-b border-[#E6E2D8] flex flex-wrap gap-2">
        {STARTER_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => handleSendMessage(prompt)}
            className="px-3.5 py-1.5 rounded-full bg-[#FFFFFF] border border-[#E6E2D8] hover:border-[#243C32] text-xs text-[#343A36] transition-colors"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Conversation Thread */}
      <div className="py-6 space-y-5 max-h-[480px] overflow-y-auto pr-1">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div key={msg.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
              <div
                className={`max-w-[85%] sm:max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  isUser
                    ? 'bg-[#243C32] text-[#FFFFFF]'
                    : 'bg-[#FFFFFF] border border-[#E6E2D8] text-[#343A36]'
                }`}
              >
                {msg.text}

                {msg.groundedDestinations && msg.groundedDestinations.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-[#E6E2D8] flex flex-wrap gap-2">
                    {msg.groundedDestinations.map((place) => (
                      <button
                        key={place}
                        type="button"
                        onClick={() => onSelectDestinationByName?.(place)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#243C32] hover:underline"
                      >
                        <MapPin className="w-3 h-3 text-[#D68B65]" />
                        <span>{place}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <span className="mt-1 text-[11px] text-[#858B84] px-1">{msg.timestamp}</span>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-[#858B84]">
            <Loader2 className="w-4 h-4 animate-spin text-[#243C32]" />
            <span>Thinking through your route...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Strip */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="pt-4 border-t border-[#E6E2D8] flex items-center gap-3"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ask about opening hours, transit options, food streets, or rainy-day swaps..."
          className="flex-1 px-4 py-3 rounded-full bg-[#FFFFFF] border border-[#E6E2D8] text-sm text-[#343A36] placeholder-[#858B84] focus:outline-none focus:border-[#243C32]"
        />
        <button
          type="submit"
          disabled={isLoading || !inputText.trim()}
          aria-label="Send message"
          className="px-5 py-3 rounded-full bg-[#243C32] hover:bg-[#1B2E26] text-[#FFFFFF] text-sm font-medium inline-flex items-center gap-2 disabled:opacity-40 transition-colors"
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline">Ask</span>
        </button>
      </form>
    </section>
  );
};

export default AIAssistantChat;
