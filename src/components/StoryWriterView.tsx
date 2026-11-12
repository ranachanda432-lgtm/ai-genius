import React, { useState } from 'react';
import {
  BookOpen,
  Sparkles,
  Download,
  Copy,
  Check,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Shuffle,
  Loader2,
  ArrowRight,
  BookMarked,
  History,
} from 'lucide-react';
import { StoryItem } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';

interface StoryWriterViewProps {
  stories: StoryItem[];
  onSaveStory: (story: StoryItem) => void;
  initialPrompt?: string;
}

const GENRES = [
  'Sci-Fi & Cyberpunk',
  'Epic Fantasy',
  'Mystery & Noir',
  'Psychological Thriller',
  'Time Travel & Paradox',
  'Dystopian Odyssey',
  'Cosmic Folklore',
];

const TONES = [
  'Cinematic & Immersive',
  'Dark & Gritty',
  'Suspenseful & Twisty',
  'Whimsical & Poetic',
  'Philosophical & Deep',
];

const LENGTHS = [
  { label: 'Flash Fiction (~350 words)', val: 'Flash fiction, around 350 words' },
  { label: 'Short Story (~750 words)', val: 'Full short story, around 750 words' },
  { label: 'Deep Chapter (~1200 words)', val: 'Extended immersive novel chapter, around 1200 words' },
];

const SAMPLE_PREMISES = [
  'In Neo-Kyoto 2099, a memory detective discovers someone is illegally mass-manufacturing synthetic childhoods.',
  'An ancient clockmaker in Prague crafts a mechanical pocket watch that ticks backwards whenever genuine love is nearby.',
  'Deep beneath Europa’s icy crust, an exploratory submarine receives a repeating knock from outside the hull.',
  'A forgotten bookstore only appears at 3:17 AM in foggy alleyways to people about to make life-altering mistakes.',
  'On an interstellar sleeper ship, the caretaker AI slowly realizes it has developed an irrational fear of darkness.',
];

export const StoryWriterView: React.FC<StoryWriterViewProps> = ({
  stories,
  onSaveStory,
  initialPrompt = '',
}) => {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [selectedGenre, setSelectedGenre] = useState(GENRES[0]);
  const [selectedTone, setSelectedTone] = useState(TONES[0]);
  const [selectedLength, setSelectedLength] = useState(LENGTHS[1].val);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStory, setCurrentStory] = useState<StoryItem | null>(stories[0] || null);
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const handleRandomize = () => {
    const random = SAMPLE_PREMISES[Math.floor(Math.random() * SAMPLE_PREMISES.length)];
    setPrompt(random);
  };

  const handleGenerateStory = async (continuation = false) => {
    const targetPrompt = continuation && currentStory
      ? `Continue the following story with Chapter 2 or the next major sequence. Build upon the characters and unresolved suspense:\n\n${currentStory.content.slice(-1000)}`
      : prompt.trim();

    if (!targetPrompt) return;

    setIsLoading(true);
    stopNarration();

    try {
      const res = await fetch('/api/story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: targetPrompt,
          genre: selectedGenre,
          tone: selectedTone,
          length: selectedLength,
          chapterTitle: continuation ? 'Next Chapter' : undefined,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();
      const content = continuation && currentStory
        ? `${currentStory.content}\n\n---\n\n${data.story}`
        : data.story;

      // Extract a nice title from first line or prompt
      const firstLineMatch = data.story.match(/^#+\s*(.+)/);
      const title = firstLineMatch ? firstLineMatch[1] : (continuation && currentStory ? currentStory.title : prompt.slice(0, 45) + '...');

      const newStoryItem: StoryItem = {
        id: String(Date.now()),
        title,
        prompt: prompt || 'Continuation',
        genre: selectedGenre,
        tone: selectedTone,
        length: selectedLength,
        content,
        createdAt: Date.now(),
      };

      setCurrentStory(newStoryItem);
      onSaveStory(newStoryItem);
    } catch (err: any) {
      alert(`Story Generation Error: ${err.message || 'Check your Gemini API connection'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!currentStory) return;
    navigator.clipboard.writeText(currentStory.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!currentStory) return;
    const blob = new Blob([currentStory.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentStory.title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Web Speech Narration
  const toggleNarration = () => {
    if (!('speechSynthesis' in window) || !currentStory) return;

    if (isSpeaking) {
      if (isPaused) {
        window.speechSynthesis.resume();
        setIsPaused(false);
      } else {
        window.speechSynthesis.pause();
        setIsPaused(true);
      }
      return;
    }

    window.speechSynthesis.cancel();
    // Strip markdown characters for cleaner speech
    const cleanText = currentStory.content.replace(/[#*`_~>-]/g, ' ');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
    setIsPaused(false);
  };

  const stopNarration = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setIsPaused(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Configuration & Input Card */}
      <div className="bg-[#151f36] border border-[#2b3856] rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#26314a]">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#8c83ff]" />
              Story Writer Studio
            </h3>
            <p className="text-xs text-[#aab4ca] mt-0.5">
              Formulate original novels, dark thrillers, and immersive worldbuilding
            </p>
          </div>

          <button
            onClick={handleRandomize}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#10182b] hover:bg-[#202947] border border-[#26314a] rounded-xl text-xs text-[#b9b0ff] font-medium transition-colors self-start sm:self-auto"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span>Random Premise</span>
          </button>
        </div>

        {/* Premise prompt input */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            Story Premise, Characters, or Plot Hook:
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your story idea, characters, conflict, setting, or twist..."
            rows={3}
            className="w-full bg-[#0d1528] border border-[#35415f] focus:border-[#7768ed] text-white placeholder:text-slate-500 p-3.5 rounded-xl outline-none resize-none text-sm transition-colors"
          />
        </div>

        {/* Options grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          {/* Genre */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Genre
            </label>
            <select
              value={selectedGenre}
              onChange={(e) => setSelectedGenre(e.target.value)}
              className="w-full bg-[#0d1528] border border-[#35415f] text-slate-200 p-2.5 rounded-xl text-xs outline-none focus:border-[#7768ed]"
            >
              {GENRES.map((g) => (
                <option key={g} value={g} className="bg-[#10182b]">
                  {g}
                </option>
              ))}
            </select>
          </div>

          {/* Tone */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Tone & Atmosphere
            </label>
            <select
              value={selectedTone}
              onChange={(e) => setSelectedTone(e.target.value)}
              className="w-full bg-[#0d1528] border border-[#35415f] text-slate-200 p-2.5 rounded-xl text-xs outline-none focus:border-[#7768ed]"
            >
              {TONES.map((t) => (
                <option key={t} value={t} className="bg-[#10182b]">
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Length */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Length / Scope
            </label>
            <select
              value={selectedLength}
              onChange={(e) => setSelectedLength(e.target.value)}
              className="w-full bg-[#0d1528] border border-[#35415f] text-slate-200 p-2.5 rounded-xl text-xs outline-none focus:border-[#7768ed]"
            >
              {LENGTHS.map((l) => (
                <option key={l.val} value={l.val} className="bg-[#10182b]">
                  {l.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Generate Button */}
        <div className="pt-2">
          <button
            onClick={() => handleGenerateStory(false)}
            disabled={isLoading || !prompt.trim()}
            className="w-full py-3.5 bg-gradient-to-r from-[#7768ed] to-[#9487ff] hover:from-[#8878ff] hover:to-[#a5b4fc] disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-lg shadow-[#7768ed]/20 flex items-center justify-center gap-2 cursor-pointer text-sm"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Weaving Story with Gemini...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate Original Story</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Generated Story Display */}
      {currentStory && (
        <div className="bg-[#151f36] border border-[#2b3856] rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          {/* Story Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#26314a]">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-[#8c83ff] uppercase tracking-wider mb-1">
                <BookMarked className="w-4 h-4" />
                <span>{currentStory.genre}</span>
                <span>•</span>
                <span className="text-slate-400">{currentStory.tone}</span>
              </div>
              <h2 className="text-2xl font-extrabold text-white">
                {currentStory.title}
              </h2>
            </div>

            {/* Action Bar */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Narration controls */}
              <button
                onClick={toggleNarration}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                  isSpeaking
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                    : 'bg-[#10182b] text-slate-300 hover:text-white border-[#26314a] hover:bg-[#202947]'
                }`}
                title="Read aloud"
              >
                {isSpeaking ? (
                  isPaused ? (
                    <>
                      <Play className="w-3.5 h-3.5 text-amber-400" />
                      <span>Resume</span>
                    </>
                  ) : (
                    <>
                      <Pause className="w-3.5 h-3.5 text-amber-400" />
                      <span>Pause Audio</span>
                    </>
                  )
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-[#8c83ff]" />
                    <span>Read Aloud</span>
                  </>
                )}
              </button>

              {isSpeaking && (
                <button
                  onClick={stopNarration}
                  className="p-1.5 rounded-xl bg-[#10182b] text-slate-400 hover:text-rose-400 border border-[#26314a]"
                  title="Stop audio"
                >
                  <VolumeX className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Copy */}
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#10182b] hover:bg-[#202947] text-xs font-medium text-slate-300 border border-[#26314a] transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>

              {/* Download */}
              <button
                onClick={handleDownload}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#10182b] hover:bg-[#202947] text-xs font-medium text-slate-300 border border-[#26314a] transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export .md</span>
              </button>
            </div>
          </div>

          {/* Story Body */}
          <div className="bg-[#10182b]/80 border border-[#232d4b] rounded-2xl p-6 sm:p-8 font-serif leading-relaxed text-slate-200 text-base shadow-inner">
            <MarkdownRenderer content={currentStory.content} />
          </div>

          {/* Continuation Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#26314a]">
            <div className="text-xs text-slate-400">
              Want to find out what happens next? Continue the narrative seamlessly.
            </div>

            <button
              onClick={() => handleGenerateStory(true)}
              disabled={isLoading}
              className="px-5 py-2.5 rounded-xl bg-[#29325b] hover:bg-[#384379] text-white text-xs font-semibold transition-all border border-[#445086] flex items-center gap-2 cursor-pointer shadow-md"
            >
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <span>Write Next Chapter</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#9487ff]" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Stories Archive / Recent */}
      {stories.length > 1 && (
        <div className="bg-[#151f36] border border-[#2b3856] rounded-2xl p-5">
          <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider mb-3">
            <History className="w-4 h-4 text-[#8c83ff]" />
            Story History ({stories.length})
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {stories.map((st) => (
              <div
                key={st.id}
                onClick={() => {
                  stopNarration();
                  setCurrentStory(st);
                }}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  currentStory?.id === st.id
                    ? 'bg-[#29325b] border-[#8c83ff] text-white'
                    : 'bg-[#10182b] border-[#26314a] text-slate-300 hover:border-[#7768ed]'
                }`}
              >
                <div className="text-xs font-bold truncate mb-1">{st.title}</div>
                <div className="text-[11px] text-[#9487ff] mb-1">{st.genre}</div>
                <div className="text-[10px] text-slate-400 line-clamp-2">{st.content.slice(0, 100)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
