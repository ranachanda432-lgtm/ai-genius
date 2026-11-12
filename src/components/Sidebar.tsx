import React from 'react';
import {
  Home,
  MessageSquare,
  BookOpen,
  Code2,
  Image as ImageIcon,
  Sparkles,
  Zap,
  Trash2,
  X,
} from 'lucide-react';
import { ToolType } from '../types';

interface SidebarProps {
  currentTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  stats: {
    totalChats: number;
    totalStories: number;
    totalCode: number;
    totalImages: number;
  };
  onClearAllHistory: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTool,
  onSelectTool,
  isOpenMobile,
  onCloseMobile,
  stats,
  onClearAllHistory,
}) => {
  const navItems: { id: ToolType; label: string; icon: React.ReactNode; symbol: string }[] = [
    { id: 'home', label: 'Home', icon: <Home className="w-4 h-4" />, symbol: '⌂' },
    { id: 'chat', label: 'AI Chat', icon: <MessageSquare className="w-4 h-4" />, symbol: '✧' },
    { id: 'story', label: 'Story Writer', icon: <BookOpen className="w-4 h-4" />, symbol: '▤' },
    { id: 'code', label: 'Code Generator', icon: <Code2 className="w-4 h-4" />, symbol: '⌘' },
    { id: 'image', label: 'Image Generator', icon: <ImageIcon className="w-4 h-4" />, symbol: '▧' },
  ];

  const totalInteractions =
    stats.totalChats + stats.totalStories + stats.totalCode + stats.totalImages;

  return (
    <>
      {/* Mobile backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-[#10182b] border-r border-[#26314a] p-5 flex flex-col justify-between transition-transform duration-300 ease-in-out ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div>
          {/* Header & Logo */}
          <div className="flex items-center justify-between mb-8">
            <div
              className="flex items-center gap-2 cursor-pointer group"
              onClick={() => {
                onSelectTool('home');
                onCloseMobile();
              }}
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#7768ed] to-[#9487ff] flex items-center justify-center text-white shadow-lg shadow-[#7768ed]/25 group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div className="text-2xl font-bold tracking-tight text-[#8c83ff]">
                AI <span className="text-white">Genius</span>
              </div>
            </div>

            <button
              onClick={onCloseMobile}
              className="md:hidden text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex flex-col gap-1.5">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-1">
              Workspace
            </div>
            {navItems.map((item) => {
              const isActive = currentTool === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectTool(item.id);
                    onCloseMobile();
                  }}
                  className={`flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-medium transition-all text-left ${
                    isActive
                      ? 'bg-[#29325b] text-white shadow-sm shadow-[#8c83ff]/20 font-semibold'
                      : 'text-[#b8c1d5] hover:bg-[#151f36] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[#8c83ff] text-base">{item.symbol}</span>
                    <span>{item.label}</span>
                  </div>
                  {item.id === 'chat' && stats.totalChats > 0 && (
                    <span className="text-[11px] bg-[#1d2744] text-[#b9b0ff] px-2 py-0.5 rounded-full">
                      {stats.totalChats}
                    </span>
                  )}
                  {item.id === 'story' && stats.totalStories > 0 && (
                    <span className="text-[11px] bg-[#1d2744] text-[#b9b0ff] px-2 py-0.5 rounded-full">
                      {stats.totalStories}
                    </span>
                  )}
                  {item.id === 'code' && stats.totalCode > 0 && (
                    <span className="text-[11px] bg-[#1d2744] text-[#b9b0ff] px-2 py-0.5 rounded-full">
                      {stats.totalCode}
                    </span>
                  )}
                  {item.id === 'image' && stats.totalImages > 0 && (
                    <span className="text-[11px] bg-[#1d2744] text-[#b9b0ff] px-2 py-0.5 rounded-full">
                      {stats.totalImages}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section */}
        <div className="pt-4 border-t border-[#26314a]/80 space-y-3">
          {/* Model Status Card */}
          <div className="p-3 bg-[#151f36] border border-[#2b3856] rounded-xl text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Engine Active
              </span>
              <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Gemini 3.8
              </span>
            </div>
            <div className="text-[11px] text-slate-400 flex justify-between">
              <span>Total Activity:</span>
              <span className="text-white font-mono">{totalInteractions} runs</span>
            </div>
          </div>

          {/* Quick Clear Button */}
          {totalInteractions > 0 && (
            <button
              onClick={() => {
                if (window.confirm('Reset and clear session activity history?')) {
                  onClearAllHistory();
                }
              }}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors border border-transparent hover:border-rose-500/20"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Reset Session History</span>
            </button>
          )}

          <div className="text-center text-[11px] text-[#69758d]">
            AI Genius v2.5 • Full Stack
          </div>
        </div>
      </aside>
    </>
  );
};
