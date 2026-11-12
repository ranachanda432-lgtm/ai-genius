import React from 'react';
import { Menu, Sparkles, Activity } from 'lucide-react';
import { ToolType } from '../types';

interface HeaderProps {
  currentTool: ToolType;
  onOpenMobileNav: () => void;
  toolTitle: string;
  tagText?: string;
}

export const Header: React.FC<HeaderProps> = ({
  currentTool,
  onOpenMobileNav,
  toolTitle,
  tagText = 'AI ASSISTANT',
}) => {
  const getSubtext = () => {
    switch (currentTool) {
      case 'home':
        return 'Multi-modal workspace & intelligent creative suite';
      case 'chat':
        return 'Interactive conversational intelligence & reasoning';
      case 'story':
        return 'Generative narrative architecture & novel drafting';
      case 'code':
        return 'Full-stack syntax synthesis & live interactive sandbox';
      case 'image':
        return 'Visual synthesis powered by Gemini multi-modal vision';
      default:
        return 'Smart AI Assistant';
    }
  };

  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8 pb-5 border-b border-[#26314a]/60">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileNav}
          className="md:hidden p-2 bg-[#151f36] border border-[#2b3856] rounded-xl text-slate-300 hover:text-white"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-white tracking-tight">{toolTitle}</h2>
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#1d2744] text-[#a5b4fc] border border-[#2b3856]">
              <Sparkles className="w-3 h-3 text-[#8c83ff]" />
              Genius Core
            </span>
          </div>
          <p className="text-xs text-[#aab4ca] mt-0.5">{getSubtext()}</p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 self-start sm:self-auto">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#242c4b] text-[#b9b0ff] border border-[#3b4670] shadow-sm">
          <Activity className="w-3.5 h-3.5 text-[#8c83ff]" />
          <span>{tagText}</span>
        </div>
      </div>
    </header>
  );
};
