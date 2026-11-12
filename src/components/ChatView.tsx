import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Loader2,
  Trash2,
  Download,
  Sparkles,
  Bot,
  User,
  Lightbulb,
  Compass,
  Code,
  PenTool,
} from 'lucide-react';
import { ChatMessage } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';

interface ChatViewProps {
  messages: ChatMessage[];
  onSendMessage: (text: string, persona: string) => Promise<void>;
  onClearChat: () => void;
  isLoading: boolean;
  initialPrompt?: string;
}

const PERSONAS = [
  { id: 'default', name: 'General Genius', icon: <Sparkles className="w-3.5 h-3.5" />, desc: 'Helpful, balanced & intelligent' },
  { id: 'thinker', name: 'Deep Reasoner', icon: <Compass className="w-3.5 h-3.5" />, desc: 'Analytical, step-by-step logic' },
  { id: 'coder', name: 'Code Architect', icon: <Code className="w-3.5 h-3.5" />, desc: 'Technical & programming focused' },
  { id: 'writer', name: 'Creative Muse', icon: <PenTool className="w-3.5 h-3.5" />, desc: 'Expressive, vivid & engaging' },
];

const SUGGESTIONS = [
  'Explain the theory of relativity using an elevator analogy',
  'Design an end-to-end architecture for a modern real-time SaaS app',
  'Write a persuasive pitch email for an AI productivity tool',
  'What are the most exciting breakthroughs in astronomy this decade?',
];

export const ChatView: React.FC<ChatViewProps> = ({
  messages,
  onSendMessage,
  onClearChat,
  isLoading,
  initialPrompt = '',
}) => {
  const [input, setInput] = useState(initialPrompt);
  const [selectedPersona, setSelectedPersona] = useState('default');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialPrompt) {
      setInput(initialPrompt);
    }
  }, [initialPrompt]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    setInput('');
    await onSendMessage(trimmed, selectedPersona);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const exportConversation = () => {
    if (messages.length === 0) return;
    const content = messages
      .map((m) => `### ${m.role === 'user' ? 'User' : 'AI Genius'} (${new Date(m.timestamp).toLocaleTimeString()})\n\n${m.content}\n\n---\n`)
      .join('\n');
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-genius-chat-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-180px)] min-h-[550px]">
      {/* Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#151f36] border border-[#293653] rounded-2xl mb-4">
        {/* Persona Selectors */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs text-slate-400 font-medium px-2 flex items-center gap-1">
            Persona:
          </span>
          {PERSONAS.map((p) => (
            <button
              key={p.id}
              disabled={isLoading}
              onClick={() => setSelectedPersona(p.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors whitespace-nowrap disabled:opacity-60 ${
                selectedPersona === p.id
                  ? 'bg-[#7768ed] text-white shadow-sm'
                  : 'bg-[#10182b] text-[#b8c1d5] hover:bg-[#202947] hover:text-white border border-[#26314a]'
              }`}
            >
              {p.icon}
              <span>{p.name}</span>
            </button>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <>
              <button
                onClick={exportConversation}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#10182b] hover:bg-[#202947] text-xs font-medium text-slate-300 border border-[#26314a] transition-colors"
                title="Export as Markdown"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Export</span>
              </button>
              <button
                disabled={isLoading}
                onClick={() => {
                  if (window.confirm('Clear conversation history?')) {
                    onClearChat();
                  }
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#10182b] hover:bg-rose-500/20 text-xs font-medium text-rose-300 hover:text-rose-200 border border-[#26314a] transition-colors disabled:opacity-50"
                title="Clear chat"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Clear</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto bg-[#10182b]/60 border border-[#26314a] rounded-2xl p-4 sm:p-6 space-y-4 shadow-inner">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#7768ed] to-[#9487ff] flex items-center justify-center text-white shadow-xl shadow-[#7768ed]/20">
              <Bot className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-2">How can AI Genius assist you?</h3>
              <p className="text-sm text-[#aab4ca] max-w-md">
                Chat freely, ask technical questions, synthesize concepts, or brainstorm new ideas.
              </p>
            </div>

            <div className="w-full max-w-lg space-y-2 pt-2">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                Try asking:
              </div>
              <div className="grid grid-cols-1 gap-2">
                {SUGGESTIONS.map((item, idx) => (
                  <button
                    key={idx}
                    disabled={isLoading}
                    onClick={() => {
                      if (!isLoading) setInput(item);
                    }}
                    className="p-2.5 rounded-xl bg-[#151f36] hover:bg-[#202947] border border-[#2b3856] text-xs text-left text-slate-300 hover:text-white transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    "{item}"
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-[88%] ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-1 ${
                    isUser
                      ? 'bg-[#7768ed] text-white shadow-sm'
                      : 'bg-[#151f36] border border-[#293653] text-[#8c83ff]'
                  }`}
                >
                  {isUser ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                </div>

                <div
                  className={`p-4 rounded-2xl shadow-md ${
                    isUser
                      ? 'bg-[#423a7d] text-white border border-[#584ea0] rounded-tr-none'
                      : 'bg-[#151f36] text-slate-100 border border-[#26314a] rounded-tl-none w-full'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4 mb-1.5 pb-1 border-b border-white/10 text-[10px] uppercase font-semibold tracking-wider text-[#b9b0ff]">
                    <span>{isUser ? 'You' : '✦ AI Genius'}</span>
                    <span className="opacity-60">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  {isUser ? (
                    <div className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                  ) : (
                    <MarkdownRenderer content={msg.content} />
                  )}
                </div>
              </div>
            );
          })
        )}

        {isLoading && (
          <div className="flex gap-3 mr-auto max-w-md">
            <div className="w-8 h-8 rounded-xl bg-[#151f36] border border-[#293653] text-[#8c83ff] flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 animate-spin" />
            </div>
            <div className="p-4 rounded-2xl bg-[#151f36] border border-[#26314a] text-slate-300 text-sm flex items-center gap-2.5">
              <Loader2 className="w-4 h-4 animate-spin text-[#8c83ff]" />
              <span>AI Genius is generating response...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Entry Form */}
      <div className="mt-4 bg-[#151f36] border border-[#293653] rounded-2xl p-3 shadow-xl">
        <div className="flex gap-2.5 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message... (Shift+Enter for new line)"
            rows={2}
            disabled={isLoading}
            className="flex-1 min-w-0 bg-[#0d1528] border border-[#35415f] focus:border-[#7768ed] text-white placeholder:text-slate-500 p-3 rounded-xl outline-none resize-none text-sm transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="h-11 px-5 bg-[#7768ed] hover:bg-[#8878ff] disabled:opacity-50 text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#7768ed]/25 cursor-pointer shrink-0"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span className="text-sm">Send</span>
                <Send className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
