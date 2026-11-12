import React, { useState } from 'react';
import {
  Code2,
  Play,
  Copy,
  Check,
  Download,
  Sparkles,
  Loader2,
  Terminal,
  Eye,
  RefreshCw,
  FileCode,
  Layers,
} from 'lucide-react';
import { CodeItem } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';

interface CodeGeneratorViewProps {
  codeItems: CodeItem[];
  onSaveCodeItem: (item: CodeItem) => void;
  initialPrompt?: string;
}

const LANGUAGES = [
  { id: 'HTML/CSS/JS', name: 'HTML, CSS & JS (Interactive Preview)', ext: 'html', previewable: true },
  { id: 'React/TypeScript', name: 'React (TSX) & Tailwind', ext: 'tsx', previewable: false },
  { id: 'Python', name: 'Python 3', ext: 'py', previewable: false },
  { id: 'Node.js/TypeScript', name: 'Node.js & Express (TypeScript)', ext: 'ts', previewable: false },
  { id: 'SQL', name: 'PostgreSQL / SQL', ext: 'sql', previewable: false },
  { id: 'Bash', name: 'Shell / Bash Script', ext: 'sh', previewable: false },
];

const CODE_PRESETS = [
  'Interactive Pomodoro timer with progress ring and sound notifications in HTML/JS',
  'Animated pricing card grid with monthly/yearly billing toggle in Tailwind CSS',
  'Retro Arcade Snake game with score tracking on an HTML5 canvas',
  'Secure Express.js auth middleware with JWT tokens and bcrypt password hashing',
  'Python script to analyze CSV sales data and calculate 30-day moving averages',
];

export const CodeGeneratorView: React.FC<CodeGeneratorViewProps> = ({
  codeItems,
  onSaveCodeItem,
  initialPrompt = '',
}) => {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [language, setLanguage] = useState(LANGUAGES[0].id);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'code' | 'preview'>('code');
  const [currentCode, setCurrentCode] = useState<CodeItem | null>(codeItems[0] || null);
  const [copied, setCopied] = useState(false);

  // Extract pure code block if markdown contains fences
  const extractRawCode = (markdownText: string) => {
    const fenceMatch = markdownText.match(/```(?:[a-zA-Z0-9_-]+)?\n([\s\S]*?)```/);
    if (fenceMatch) {
      return fenceMatch[1];
    }
    return markdownText;
  };

  const handleGenerateCode = async (customPrompt?: string) => {
    const promptToSend = customPrompt || prompt.trim();
    if (!promptToSend) return;

    setIsLoading(true);

    try {
      const res = await fetch('/api/code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptToSend,
          language,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();
      const rawOutput = data.result || '';
      const pureCode = extractRawCode(rawOutput);

      const newItem: CodeItem = {
        id: String(Date.now()),
        title: promptToSend.slice(0, 45) + (promptToSend.length > 45 ? '...' : ''),
        prompt: promptToSend,
        language,
        code: pureCode,
        explanation: rawOutput,
        createdAt: Date.now(),
      };

      setCurrentCode(newItem);
      onSaveCodeItem(newItem);

      // If HTML/CSS/JS and previewable, default to preview or code
      if (language === 'HTML/CSS/JS' && pureCode.includes('<')) {
        setActiveTab('preview');
      } else {
        setActiveTab('code');
      }
    } catch (err: any) {
      alert(`Code Generation Error: ${err.message || 'Check your Gemini API connection'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!currentCode) return;
    navigator.clipboard.writeText(currentCode.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!currentCode) return;
    const selectedLangObj = LANGUAGES.find((l) => l.id === currentCode.language);
    const ext = selectedLangObj ? selectedLangObj.ext : 'txt';
    const blob = new Blob([currentCode.code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `genius-snippet-${Date.now()}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Prepare safe HTML iframe preview
  const getPreviewDoc = () => {
    if (!currentCode) return '';
    let code = currentCode.code;

    // If it's pure HTML snippet without full doc, wrap it
    if (!code.includes('<html') && !code.includes('<!DOCTYPE')) {
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { margin: 0; padding: 20px; font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; }
  </style>
</head>
<body>
  ${code}
</body>
</html>`;
    }
    return code;
  };

  const isHtmlPreviewable =
    currentCode?.language === 'HTML/CSS/JS' ||
    (currentCode?.code.includes('<div') || currentCode?.code.includes('<html'));

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Code Prompt Card */}
      <div className="bg-[#151f36] border border-[#2b3856] rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#26314a]">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Code2 className="w-5 h-5 text-[#8c83ff]" />
              Code Generator & Live Sandbox
            </h3>
            <p className="text-xs text-[#aab4ca] mt-0.5">
              Synthesize production-grade algorithms, frontend components, and backend APIs
            </p>
          </div>

          {/* Language Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Target:</span>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-[#10182b] border border-[#26314a] text-slate-200 p-2 rounded-xl text-xs outline-none focus:border-[#7768ed]"
            >
              {LANGUAGES.map((l) => (
                <option key={l.id} value={l.id} className="bg-[#10182b]">
                  {l.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Prompt Input */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            What do you want to build?
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. Build an interactive calculator with memory functions in HTML/Tailwind/JavaScript..."
            rows={3}
            className="w-full bg-[#0d1528] border border-[#35415f] focus:border-[#7768ed] text-white placeholder:text-slate-500 p-3.5 rounded-xl outline-none resize-none text-sm transition-colors"
          />
        </div>

        {/* Preset Chips */}
        <div>
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Quick Templates:
          </div>
          <div className="flex flex-wrap gap-2">
            {CODE_PRESETS.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => setPrompt(preset)}
                className="text-left px-2.5 py-1.5 rounded-lg bg-[#10182b] hover:bg-[#202947] border border-[#26314a] text-xs text-slate-300 hover:text-white transition-colors truncate max-w-xs"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Generate Button */}
        <div>
          <button
            onClick={() => handleGenerateCode()}
            disabled={isLoading || !prompt.trim()}
            className="w-full py-3.5 bg-gradient-to-r from-[#7768ed] to-[#9487ff] hover:from-[#8878ff] hover:to-[#a5b4fc] disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-lg shadow-[#7768ed]/20 flex items-center justify-center gap-2 cursor-pointer text-sm"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Synthesizing Code with Gemini...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate Solution</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code Viewer & Preview Sandbox */}
      {currentCode && (
        <div className="bg-[#151f36] border border-[#2b3856] rounded-2xl shadow-2xl overflow-hidden">
          {/* Header tabs & tools */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-[#10182b] border-b border-[#26314a]">
            {/* Tabs */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('code')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'code'
                    ? 'bg-[#29325b] text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-[#151f36]'
                }`}
              >
                <Terminal className="w-3.5 h-3.5 text-[#8c83ff]" />
                <span>Code & Architecture</span>
              </button>

              {isHtmlPreviewable && (
                <button
                  onClick={() => setActiveTab('preview')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === 'preview'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-[#151f36]'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Live Sandbox Preview</span>
                </button>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#151f36] hover:bg-[#202947] text-xs font-medium text-slate-300 border border-[#26314a] transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Code'}</span>
              </button>

              <button
                onClick={handleDownload}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#151f36] hover:bg-[#202947] text-xs font-medium text-slate-300 border border-[#26314a] transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </button>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'code' ? (
            <div className="p-5 sm:p-6 space-y-5">
              {/* Syntax code block */}
              <div className="relative group">
                <div className="bg-[#080d1a] border border-[#222c4a] rounded-xl p-4 sm:p-5 overflow-x-auto font-mono text-xs sm:text-sm text-[#cbd5e1] leading-relaxed shadow-inner max-h-[480px]">
                  <pre>
                    <code>{currentCode.code}</code>
                  </pre>
                </div>
              </div>

              {/* Explanation breakdown */}
              {currentCode.explanation && (
                <div className="pt-4 border-t border-[#26314a]">
                  <div className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-[#8c83ff]" />
                    Explanation & Engineering Notes
                  </div>
                  <div className="bg-[#10182b] border border-[#26314a] rounded-xl p-4 text-xs text-slate-300 leading-relaxed">
                    <MarkdownRenderer content={currentCode.explanation} />
                  </div>
                </div>
              )}

              {/* Quick Code Iteration Actions */}
              <div className="pt-2 flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-400 font-medium">Refine with AI:</span>
                <button
                  onClick={() =>
                    handleGenerateCode(
                      `Optimize the following code for high performance and add clean TypeScript types/comments:\n\n${currentCode.code}`
                    )
                  }
                  className="px-2.5 py-1 rounded-lg bg-[#10182b] hover:bg-[#202947] border border-[#26314a] text-xs text-[#a5b4fc] transition-colors"
                >
                  ⚡ Optimize Performance
                </button>
                <button
                  onClick={() =>
                    handleGenerateCode(
                      `Add comprehensive error handling, try/catch blocks, and validation to this code:\n\n${currentCode.code}`
                    )
                  }
                  className="px-2.5 py-1 rounded-lg bg-[#10182b] hover:bg-[#202947] border border-[#26314a] text-xs text-[#a5b4fc] transition-colors"
                >
                  🛡️ Add Error Handling
                </button>
                <button
                  onClick={() =>
                    handleGenerateCode(
                      `Write unit tests and test cases for this code implementation:\n\n${currentCode.code}`
                    )
                  }
                  className="px-2.5 py-1 rounded-lg bg-[#10182b] hover:bg-[#202947] border border-[#26314a] text-xs text-[#a5b4fc] transition-colors"
                >
                  🧪 Add Unit Tests
                </button>
              </div>
            </div>
          ) : (
            /* Live Sandbox Preview */
            <div className="p-4 sm:p-6 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Interactive Sandboxed Iframe Preview</span>
                <span className="text-emerald-400 flex items-center gap-1 font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Live Execution
                </span>
              </div>
              <div className="w-full h-[520px] bg-slate-900 rounded-xl border border-[#26314a] overflow-hidden shadow-2xl">
                <iframe
                  title="Code Sandbox"
                  srcDoc={getPreviewDoc()}
                  sandbox="allow-scripts allow-modals"
                  className="w-full h-full border-0 bg-[#0d1528]"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Code History */}
      {codeItems.length > 1 && (
        <div className="bg-[#151f36] border border-[#2b3856] rounded-2xl p-5">
          <div className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#8c83ff]" />
            Generated Code Snippets ({codeItems.length})
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {codeItems.map((ci) => (
              <div
                key={ci.id}
                onClick={() => {
                  setCurrentCode(ci);
                  setActiveTab('code');
                }}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  currentCode?.id === ci.id
                    ? 'bg-[#29325b] border-[#8c83ff] text-white'
                    : 'bg-[#10182b] border-[#26314a] text-slate-300 hover:border-[#7768ed]'
                }`}
              >
                <div className="text-xs font-bold truncate mb-1">{ci.title}</div>
                <div className="text-[11px] text-[#9487ff] font-mono mb-1">{ci.language}</div>
                <div className="text-[10px] font-mono text-slate-400 truncate">{ci.code.slice(0, 80)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
