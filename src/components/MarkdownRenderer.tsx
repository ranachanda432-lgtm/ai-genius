import React, { useMemo } from 'react';
import { marked } from 'marked';
import { Check, Copy } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  const [copied, setCopied] = React.useState(false);

  const htmlContent = useMemo(() => {
    try {
      return marked.parse(content || '', {
        gfm: true,
        breaks: true,
      }) as string;
    } catch {
      return content;
    }
  }, [content]);

  const handleCopyRaw = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`relative group ${className}`}>
      <div
        className="markdown-body leading-relaxed"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
      <button
        onClick={handleCopyRaw}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md bg-[#10182b]/80 hover:bg-[#29325b] text-slate-300 hover:text-white border border-[#2b3856] text-xs flex items-center gap-1.5 backdrop-blur-sm"
        title="Copy raw markdown"
      >
        {copied ? (
          <>
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-emerald-400">Copied</span>
          </>
        ) : (
          <>
            <Copy className="w-3.5 h-3.5" />
            <span>Copy</span>
          </>
        )}
      </button>
    </div>
  );
};
