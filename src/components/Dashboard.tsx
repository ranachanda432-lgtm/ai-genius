import React, { useState } from 'react';
import {
  MessageSquare,
  BookOpen,
  Code2,
  Image as ImageIcon,
  Sparkles,
  Send,
  Loader2,
  ArrowRight,
  TrendingUp,
  FileText,
  Clock,
} from 'lucide-react';
import { ToolType, ChatMessage, StoryItem, CodeItem, ImageItem } from '../types';

interface DashboardProps {
  onSelectTool: (tool: ToolType) => void;
  onSendQuickPrompt: (tool: ToolType, prompt: string) => void;
  recentStories: StoryItem[];
  recentCode: CodeItem[];
  recentImages: ImageItem[];
}

export const Dashboard: React.FC<DashboardProps> = ({
  onSelectTool,
  onSendQuickPrompt,
  recentStories,
  recentCode,
  recentImages,
}) => {
  const [quickInput, setQuickInput] = useState('');
  const [quickMessages, setQuickMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hello! Welcome to AI Genius. How can I help you today?',
      timestamp: Date.now(),
    },
  ]);
  const [isQuickLoading, setIsQuickLoading] = useState(false);

  const handleQuickSend = async () => {
    const trimmed = quickInput.trim();
    if (!trimmed || isQuickLoading) return;

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
    };

    const botMessageId = String(Date.now() + 1);
    const botPlaceholderMsg: ChatMessage = {
      id: botMessageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    };

    setQuickMessages((prev) => [...prev, userMsg, botPlaceholderMsg]);
    setQuickInput('');
    setIsQuickLoading(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 40000);
    let accumulatedText = '';

    try {
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          messages: [{ role: 'user', content: trimmed }],
        }),
      });

      if (!res.ok) {
        let errData: any = null;
        try {
          errData = await res.json();
        } catch {}
        throw new Error(errData?.error || `Server responded with status ${res.status}`);
      }

      if (!res.body) {
        throw new Error('Streaming not supported in this browser.');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine.startsWith('data:')) continue;

          const dataPayload = trimmedLine.replace(/^data:\s*/, '');
          if (dataPayload === '[DONE]') {
            break;
          }

          try {
            const parsed = JSON.parse(dataPayload);
            if (parsed.error) {
              throw new Error(parsed.error);
            }
            if (parsed.text) {
              accumulatedText += parsed.text;
              setQuickMessages((prev) =>
                prev.map((m) =>
                  m.id === botMessageId ? { ...m, content: accumulatedText } : m
                )
              );
            }
          } catch (jsonErr: any) {
            // Ignore incomplete chunks
          }
        }
      }

      clearTimeout(timeoutId);

      if (!accumulatedText.trim()) {
        setQuickMessages((prev) =>
          prev.map((m) =>
            m.id === botMessageId
              ? { ...m, content: 'I apologize, but no response was returned. Please try again.' }
              : m
          )
        );
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      const isAbort = err.name === 'AbortError';
      const errorMessage = isAbort
        ? '⚠️ Request timed out. The AI model took too long to stream. Please try again.'
        : `Error: ${err.message || 'Could not connect to AI service. Please verify your connection.'}`;

      setQuickMessages((prev) =>
        prev.map((m) =>
          m.id === botMessageId
            ? { ...m, content: accumulatedText ? `${accumulatedText}\n\n${errorMessage}` : errorMessage }
            : m
        )
      );
    } finally {
      setIsQuickLoading(false);
    }
  };

  const toolCards = [
    {
      id: 'chat' as ToolType,
      icon: <MessageSquare className="w-6 h-6 text-[#9487ff]" />,
      emoji: '💬',
      title: 'AI Chat',
      desc: 'Chat with your smart AI assistant with advanced reasoning and memory.',
      tag: 'Reasoning & Q&A',
      accent: 'border-[#7768ed]/40 hover:border-[#8c83ff]',
      gradient: 'from-[#7768ed]/10 to-transparent',
    },
    {
      id: 'story' as ToolType,
      icon: <BookOpen className="w-6 h-6 text-[#9487ff]" />,
      emoji: '📖',
      title: 'Story Writer',
      desc: 'Create amazing original stories, novels, flash fiction and lore.',
      tag: 'Fiction & Worldbuilding',
      accent: 'border-[#8c83ff]/40 hover:border-[#a5b4fc]',
      gradient: 'from-[#8c83ff]/10 to-transparent',
    },
    {
      id: 'code' as ToolType,
      icon: <Code2 className="w-6 h-6 text-[#9487ff]" />,
      emoji: '💻',
      title: 'Code Generator',
      desc: 'Generate HTML, CSS, JavaScript, React, Python and backend scripts.',
      tag: 'Interactive Sandbox',
      accent: 'border-[#7768ed]/40 hover:border-[#8c83ff]',
      gradient: 'from-[#7768ed]/10 to-transparent',
    },
    {
      id: 'image' as ToolType,
      icon: <ImageIcon className="w-6 h-6 text-[#9487ff]" />,
      emoji: '🎨',
      title: 'Image Generator',
      desc: 'Explore AI image creation, photorealism, cyber arts and styling.',
      tag: 'Multimodal Vision',
      accent: 'border-[#8c83ff]/40 hover:border-[#a5b4fc]',
      gradient: 'from-[#8c83ff]/10 to-transparent',
    },
  ];

  const quickIdeas = [
    { tool: 'chat' as ToolType, label: 'Explain Quantum Computing in 3 simple analogies' },
    { tool: 'story' as ToolType, label: 'A detective in 2099 who hunts glitching memories' },
    { tool: 'code' as ToolType, label: 'Modern interactive pomodoro timer with sound in HTML/JS' },
    { tool: 'image' as ToolType, label: 'A neon cyberpunk city floating on holographic oceans' },
  ];

  return (
    <div className="space-y-10 max-w-5xl mx-auto">
      {/* Hero Section */}
      <section className="text-center my-6 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1b2542] border border-[#2e3b60] text-xs font-medium text-[#b9b0ff] mb-4">
          <Sparkles className="w-3.5 h-3.5 text-[#9487ff]" />
          Powered by Gemini 3.8 Intelligence
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white mb-4 leading-tight">
          Welcome to <span className="text-[#9487ff]">AI Genius</span>
        </h1>
        <p className="text-base sm:text-lg text-[#aab4ca] leading-relaxed">
          Your smart AI assistant workspace. Ask complex questions, write original stories, synthesize production code, and generate visual artwork in one place.
        </p>
      </section>

      {/* 4 Tool Cards (Faithful to original HTML layout) */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
        {toolCards.map((tool) => (
          <div
            key={tool.id}
            onClick={() => onSelectTool(tool.id)}
            className={`group relative p-6 bg-[#151f36] border border-[#2b3856] rounded-2xl cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#7768ed]/10 ${tool.accent} overflow-hidden`}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${tool.gradient} opacity-0 group-hover:opacity-100 transition-opacity`} />
            
            <div className="relative z-10 flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl p-2.5 bg-[#10182b] rounded-xl border border-[#26314a]">
                    {tool.emoji}
                  </span>
                  <span className="text-[11px] font-semibold tracking-wide uppercase px-2.5 py-1 rounded-md bg-[#242c4b] text-[#b9b0ff] border border-[#35415f]">
                    {tool.tag}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white group-hover:text-[#9487ff] transition-colors flex items-center gap-2">
                  {tool.title}
                  <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-[#9487ff]" />
                </h3>
                <p className="text-sm text-[#aab4ca] mt-2 leading-relaxed">
                  {tool.desc}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-[#26314a]/60 flex items-center text-xs font-medium text-[#8c83ff] group-hover:text-white transition-colors">
                Launch {tool.title} &rarr;
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Quick Prompt Starters */}
      <section className="max-w-3xl mx-auto">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 px-1">
          <TrendingUp className="w-3.5 h-3.5 text-[#8c83ff]" />
          Instant Inspirations
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {quickIdeas.map((idea, idx) => (
            <button
              key={idx}
              onClick={() => onSendQuickPrompt(idea.tool, idea.label)}
              className="text-left p-3 rounded-xl bg-[#10182b] border border-[#26314a] hover:border-[#7768ed]/60 hover:bg-[#151f36] text-xs text-[#cad5ed] hover:text-white transition-all flex items-center justify-between group"
            >
              <span className="truncate pr-2">"{idea.label}"</span>
              <span className="text-[10px] text-[#8c83ff] font-medium uppercase px-2 py-0.5 rounded bg-[#242c4b] whitespace-nowrap group-hover:bg-[#7768ed] group-hover:text-white transition-colors">
                {idea.tool}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Live Interactive Chat Console (Faithful to the original HTML layout) */}
      <section className="max-w-3xl mx-auto bg-[#151f36] border border-[#293653] rounded-2xl p-5 shadow-2xl">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#26314a]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold text-white tracking-wide uppercase">
              Fast Console
            </span>
            <span className="text-xs text-slate-400">| Ask anything directly</span>
          </div>
          <button
            onClick={() => onSelectTool('chat')}
            className="text-xs text-[#8c83ff] hover:text-white transition-colors flex items-center gap-1"
          >
            Open Full Studio &rarr;
          </button>
        </div>

        {/* Message feed */}
        <div className="h-48 overflow-y-auto pr-1 space-y-3 font-sans text-sm">
          {quickMessages.map((msg) => (
            <div
              key={msg.id}
              className={`p-3.5 rounded-xl leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-[#423a7d] text-white ml-8 sm:ml-12 border border-[#584ea0]'
                  : 'bg-[#242e4d] text-[#e2e8f0] mr-4 sm:mr-8 border border-[#2b3856]'
              }`}
            >
              <div className="text-[10px] uppercase font-bold tracking-wider text-[#b9b0ff] mb-1">
                {msg.role === 'user' ? 'You' : '✦ AI Genius'}
              </div>
              {msg.content}
            </div>
          ))}
          {isQuickLoading && (
            <div className="bg-[#242e4d] text-slate-300 p-3 rounded-xl flex items-center gap-2 text-sm border border-[#2b3856]">
              <Loader2 className="w-4 h-4 animate-spin text-[#8c83ff]" />
              <span>Thinking with Gemini...</span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="flex gap-2.5 mt-4">
          <input
            value={quickInput}
            onChange={(e) => setQuickInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleQuickSend()}
            placeholder="Ask AI Genius something..."
            disabled={isQuickLoading}
            className="flex-1 min-w-0 bg-[#0d1528] border border-[#35415f] focus:border-[#7768ed] text-white placeholder:text-slate-500 px-4 py-3 rounded-xl outline-none transition-colors text-sm"
          />
          <button
            onClick={handleQuickSend}
            disabled={isQuickLoading || !quickInput.trim()}
            className="bg-[#7768ed] hover:bg-[#8878ff] disabled:opacity-50 text-white font-medium px-5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-[#7768ed]/20 text-sm"
          >
            {isQuickLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>Send</span>
                <Send className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </section>

      {/* Recent Activity Previews if any */}
      {(recentStories.length > 0 || recentCode.length > 0 || recentImages.length > 0) && (
        <section className="max-w-3xl mx-auto pt-4 border-t border-[#26314a]/80">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#8c83ff]" />
              Recent Workspace Generations
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {recentStories.slice(0, 1).map((s) => (
              <div
                key={s.id}
                onClick={() => onSelectTool('story')}
                className="p-3 bg-[#10182b] border border-[#26314a] rounded-xl hover:border-[#7768ed] cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-1.5 text-xs text-[#9487ff] font-semibold mb-1">
                  <BookOpen className="w-3.5 h-3.5" /> Story
                </div>
                <div className="text-sm font-medium text-white truncate">{s.title || s.prompt}</div>
                <div className="text-[11px] text-slate-400 mt-1 line-clamp-2">{s.content}</div>
              </div>
            ))}

            {recentCode.slice(0, 1).map((c) => (
              <div
                key={c.id}
                onClick={() => onSelectTool('code')}
                className="p-3 bg-[#10182b] border border-[#26314a] rounded-xl hover:border-[#7768ed] cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-1.5 text-xs text-[#9487ff] font-semibold mb-1">
                  <Code2 className="w-3.5 h-3.5" /> Code ({c.language})
                </div>
                <div className="text-sm font-medium text-white truncate">{c.title || c.prompt}</div>
                <div className="text-[11px] font-mono text-slate-400 mt-1 truncate">{c.code.slice(0, 60)}...</div>
              </div>
            ))}

            {recentImages.slice(0, 1).map((img) => (
              <div
                key={img.id}
                onClick={() => onSelectTool('image')}
                className="p-3 bg-[#10182b] border border-[#26314a] rounded-xl hover:border-[#7768ed] cursor-pointer transition-colors flex items-center gap-3"
              >
                <img
                  src={img.imageUrl}
                  alt={img.prompt}
                  className="w-12 h-12 object-cover rounded-lg border border-[#26314a]"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-xs text-[#9487ff] font-semibold">
                    <ImageIcon className="w-3.5 h-3.5" /> Image
                  </div>
                  <div className="text-xs text-white truncate mt-1">{img.prompt}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
