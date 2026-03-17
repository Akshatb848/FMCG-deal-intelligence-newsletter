'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Sparkles, RotateCcw, Bot, User } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useDealsData } from '@/hooks/useDeals';
import { sendAIMessage } from '@/lib/api';
import { AI_QUICK_PROMPTS } from '@/lib/mockData';
import { cn } from '@/lib/utils';

function MessageBubble({ role, content, isLatest }: {
  role: 'user' | 'assistant';
  content: string;
  isLatest: boolean;
}) {
  const isUser = role === 'user';

  // Render markdown-like content (bold, bullet lists)
  const renderContent = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, i) => {
      // Bold: **text**
      const rendered = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      // Italic: _text_
      const renderedItalic = rendered.replace(/_(.*?)_/g, '<em>$1</em>');
      return (
        <p
          key={i}
          className={cn('leading-relaxed', i > 0 && 'mt-1')}
          dangerouslySetInnerHTML={{ __html: renderedItalic }}
        />
      );
    });
  };

  return (
    <motion.div
      initial={isLatest ? { opacity: 0, y: 8 } : {}}
      animate={{ opacity: 1, y: 0 }}
      className={cn('flex gap-2.5', isUser && 'flex-row-reverse')}
    >
      <div className={cn(
        'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
        isUser
          ? 'bg-gradient-to-br from-blue-500 to-violet-600'
          : 'bg-gradient-to-br from-violet-500 to-pink-500',
      )}>
        {isUser
          ? <User className="w-3 h-3 text-white" />
          : <Bot  className="w-3 h-3 text-white" />
        }
      </div>
      <div className={cn(
        'max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed',
        isUser
          ? 'bg-primary/20 border border-primary/20 text-foreground'
          : 'bg-white/[0.05] border border-white/[0.08] text-foreground',
      )}>
        {renderContent(content)}
      </div>
    </motion.div>
  );
}

export function AIAssistant() {
  const { isOpen, messages, isLoading, addMessage, setLoading, toggleChat, clearMessages } = useStore();
  const { data } = useDealsData();
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 200);
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isOpen, messages.length]);

  const send = async (text?: string) => {
    const query = (text ?? input).trim();
    if (!query || isLoading) return;

    setInput('');
    addMessage({ role: 'user', content: query });
    setLoading(true);

    try {
      const context = {
        articles: (data?.articles ?? []).map((a) => ({
          title: a.title,
          deal_type_detected: a.deal_type_detected,
          source: a.source,
          relevance_score: a.relevance_score,
        })),
      };
      const reply = await sendAIMessage(query, context);
      addMessage({ role: 'assistant', content: reply });
    } catch {
      addMessage({ role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: 20, scale: 0.96 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 20, scale: 0.96 }}
          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          className="fixed bottom-4 right-4 w-80 max-h-[520px] flex flex-col
                     glass rounded-xl shadow-2xl shadow-black/50 z-40 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3
                          border-b border-white/[0.08] flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-pink-500
                              flex items-center justify-center">
                <Sparkles className="w-3 h-3 text-white" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">FMCG AI Assistant</p>
                <p className="text-[10px] text-emerald-400">Online</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={clearMessages}
                className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground
                           hover:text-foreground hover:bg-white/[0.05] transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
              <button
                onClick={toggleChat}
                className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground
                           hover:text-foreground hover:bg-white/[0.05] transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
            {messages.length === 0 ? (
              <div className="space-y-3">
                <div className="text-center py-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-pink-500
                                  flex items-center justify-center mx-auto mb-2">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-xs font-medium text-foreground">Ask me about FMCG deals</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    AI-powered insights from your deal pipeline
                  </p>
                </div>
                <div className="space-y-1.5">
                  {AI_QUICK_PROMPTS.slice(0, 4).map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => send(prompt)}
                      className="w-full text-left px-3 py-2 rounded-lg bg-white/[0.04]
                                 border border-white/[0.06] text-[11px] text-muted-foreground
                                 hover:text-foreground hover:bg-white/[0.08] hover:border-white/[0.12]
                                 transition-all"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg, i) => (
                  <MessageBubble
                    key={msg.id}
                    role={msg.role}
                    content={msg.content}
                    isLatest={i === messages.length - 1}
                  />
                ))}
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex gap-2.5"
                  >
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500
                                    to-pink-500 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-3 h-3 text-white" />
                    </div>
                    <div className="bg-white/[0.05] border border-white/[0.08] rounded-xl
                                    px-3 py-2 flex items-center gap-1">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-muted-foreground"
                          animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                          transition={{ duration: 0.8, delay: i * 0.15, repeat: Infinity }}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
                <div ref={bottomRef} />
              </>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-white/[0.08] p-2.5 flex-shrink-0">
            <div className="flex items-center gap-2 bg-white/[0.04] rounded-lg
                            border border-white/[0.08] px-3 py-2
                            focus-within:border-primary/40 transition-colors">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Ask about deals…"
                className="flex-1 bg-transparent text-xs text-foreground
                           placeholder:text-muted-foreground outline-none"
              />
              <button
                onClick={() => send()}
                disabled={!input.trim() || isLoading}
                className={cn(
                  'w-6 h-6 flex items-center justify-center rounded transition-all',
                  input.trim() && !isLoading
                    ? 'text-primary hover:bg-primary/10'
                    : 'text-muted-foreground opacity-40',
                )}
              >
                <Send className="w-3 h-3" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
