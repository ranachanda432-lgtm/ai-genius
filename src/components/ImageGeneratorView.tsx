import React, { useState, useRef } from 'react';
import {
  Image as ImageIcon,
  Sparkles,
  Download,
  Copy,
  Check,
  Maximize2,
  X,
  Loader2,
  Shuffle,
  Layers,
  Palette,
  Ratio,
  AlertCircle,
  Upload,
  RefreshCw,
  Trash2,
  FileImage,
  RotateCcw,
  Camera,
} from 'lucide-react';
import { ImageItem, UploadedImage } from '../types';

interface ImageGeneratorViewProps {
  images: ImageItem[];
  onSaveImage: (item: ImageItem) => void;
  initialPrompt?: string;
}

// 8 Required Professional Styles
const STYLES = [
  'Realistic Photography',
  '3D Cartoon',
  'Anime',
  'Cinematic',
  'Fantasy',
  'Product Photography',
  'Logos',
  'Digital Art',
];

const STYLE_DESCRIPTIONS: Record<string, string> = {
  'Realistic Photography': 'Photorealistic, natural lighting, authentic skin textures & reflections',
  '3D Cartoon': 'Stylized Pixar/DreamWorks 3D character render with vibrant lighting',
  'Anime': 'High-end contemporary Japanese anime style with crisp cel-shading',
  'Cinematic': 'Hollywood anamorphic widescreen movie still with dramatic lighting',
  'Fantasy': 'Epic mythical digital art with magical particles & grand atmosphere',
  'Product Photography': 'Studio catalog photography with softbox lighting & crisp reflections',
  'Logos': 'Modern iconic vector-style logo emblem with clean geometry',
  'Digital Art': 'High-detail concept art masterpiece with rich painterly brushwork',
};

// Aspect Ratios: 1:1, 16:9, 9:16, 4:3, 3:4
const ASPECT_RATIOS = [
  { id: '1:1', label: '1:1 Square', icon: '■' },
  { id: '16:9', label: '16:9 Cinematic', icon: '▬' },
  { id: '9:16', label: '9:16 Mobile', icon: '▮' },
  { id: '4:3', label: '4:3 Standard', icon: '▰' },
  { id: '3:4', label: '3:4 Portrait', icon: '▱' },
];

const TEXT_PRESETS = [
  'Hyper-realistic close-up portrait of an elderly watchmaker working under warm lamplight in Zurich',
  'A sleek ceramic coffee mug floating on smooth pastel water with soft morning light reflections',
  'Futuristic Japanese bullet train gliding across neon-lit skybridges in a rainy cyberpunk metropolis',
  'Cute 3D animated baby red panda exploring a mystical bamboo forest with fireflies',
  'Majestic crystalline frost dragon perched atop an arctic mountain under the green northern lights',
  'Minimalist geometric mountain and sun logo emblem with elegant typography on navy background',
];

const MULTIMODAL_PRESETS = [
  'Preserve the subject identity and pose from this image, but place them in a golden hour autumn park',
  'Reimagine this subject in a high-end 3D Pixar-style animated render with warm studio lighting',
  'Convert this scene into a dramatic cinematic Hollywood film still with anamorphic lens flares',
  'Transform this into a vibrant contemporary anime illustration with scenic Makoto Shinkai skies',
];

export const ImageGeneratorView: React.FC<ImageGeneratorViewProps> = ({
  images,
  onSaveImage,
  initialPrompt = '',
}) => {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [style, setStyle] = useState(STYLES[0]);
  const [aspectRatio, setAspectRatio] = useState(ASPECT_RATIOS[0].id);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [currentImage, setCurrentImage] = useState<ImageItem | null>(images[0] || null);
  const [lightboxImage, setLightboxImage] = useState<ImageItem | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isQuotaError, setIsQuotaError] = useState(false);

  // Uploaded Reference Image State
  const [uploadedImage, setUploadedImage] = useState<UploadedImage | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const validateAndProcessFile = (file: File) => {
    setErrorMsg(null);
    setIsQuotaError(false);
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const validExtensions = /\.(jpg|jpeg|png|webp)$/i;

    if (!validTypes.includes(file.type.toLowerCase()) && !validExtensions.test(file.name)) {
      setErrorMsg('Invalid file format. Please upload a JPG, JPEG, PNG, or WEBP image.');
      return;
    }

    const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_SIZE_BYTES) {
      setErrorMsg(`File is too large (${formatFileSize(file.size)}). Maximum supported file size is 10MB.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        setUploadedImage({
          dataUrl,
          mimeType: file.type || 'image/png',
          name: file.name,
          size: file.size,
        });
      }
    };
    reader.onerror = () => {
      setErrorMsg('Failed to read the selected image file. Please try again.');
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndProcessFile(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      validateAndProcessFile(file);
    }
  };

  const handleRemoveImage = () => {
    setUploadedImage(null);
    setErrorMsg(null);
    setIsQuotaError(false);
  };

  const handleClearAll = () => {
    setPrompt('');
    setUploadedImage(null);
    setErrorMsg(null);
    setIsQuotaError(false);
  };

  const handleRandomize = () => {
    const presets = uploadedImage ? MULTIMODAL_PRESETS : TEXT_PRESETS;
    const random = presets[Math.floor(Math.random() * presets.length)];
    setPrompt(random);
  };

  const handleGenerate = async () => {
    const trimmed = prompt.trim();
    if ((!trimmed && !uploadedImage) || isLoading) return;

    setIsLoading(true);
    setErrorMsg(null);
    setIsQuotaError(false);
    setLoadingStep(
      uploadedImage
        ? 'Analyzing reference image features & subject identity...'
        : 'Configuring scene composition & camera parameters...'
    );

    const stepTimer1 = setTimeout(() => {
      setLoadingStep('Synthesizing high-resolution pixels with Gemini AI...');
    }, 2500);

    const stepTimer2 = setTimeout(() => {
      setLoadingStep('Refining textures, professional lighting, and color grading...');
    }, 6000);

    try {

const res = await fetch('https://ai-genius-image.ranachanda432.workers.dev/api/image', {        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: trimmed || (uploadedImage ? 'Reimagine and enhance this visual' : 'High quality visual'),
          style,
          aspectRatio,
          uploadedImage: uploadedImage
            ? {
                dataUrl: uploadedImage.dataUrl,
                mimeType: uploadedImage.mimeType,
                name: uploadedImage.name,
              }
            : undefined,
        }),
      });

const data = await res.json();
      if (!res.ok) {
        if (res.status === 429 || data.isQuotaError) {
          setIsQuotaError(true);
        }
        throw new Error(data.error || `Server returned error (${res.status})`);
      }

      if (!data.imageUrl) {
        throw new Error(data.error || 'The model did not return image data.');
      }

      const newItem: ImageItem = {
        id: String(Date.now()),
        prompt: trimmed || (uploadedImage ? `Enhanced: ${uploadedImage.name}` : 'AI Generated Artwork'),
        style,
        aspectRatio: data.aspectRatio || aspectRatio,
        imageUrl: data.imageUrl,
        modelUsed: data.modelUsed,
        uploadedImagePreview: uploadedImage?.dataUrl,
        uploadedImageName: uploadedImage?.name,
        createdAt: Date.now(),
      };

      setCurrentImage(newItem);
      onSaveImage(newItem);
    } catch (err: any) {
      console.error('Image generation error:', err);
      setErrorMsg(
        err.message ||
          'Failed to generate image. Please check your prompt and Gemini API configuration.'
      );
    } finally {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  const handleDownloadImage = (img: ImageItem) => {
    const a = document.createElement('a');
    a.href = img.imageUrl;
    const cleanName = (img.prompt || 'ai-genius-art')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .slice(0, 40)
      .replace(/^-|-$/g, '');
    a.download = `${cleanName || 'ai-genius'}-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopyPrompt = (p: string) => {
    navigator.clipboard.writeText(p);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Hidden native file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        className="hidden"
      />

      {/* Main Studio Configuration Card */}
      <div className="bg-[#151f36] border border-[#2b3856] rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#26314a]">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Camera className="w-5 h-5 text-[#8c83ff]" />
              AI Image Generator & Visual Studio
            </h3>
            <p className="text-xs text-[#aab4ca] mt-0.5">
              Professional text-to-image and reference-guided image-to-image synthesis powered by Gemini
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={handleRandomize}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#10182b] hover:bg-[#202947] border border-[#26314a] rounded-xl text-xs text-[#b9b0ff] font-medium transition-colors cursor-pointer"
              title="Get an inspirational idea"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>Inspiration</span>
            </button>

            {(prompt || uploadedImage) && (
              <button
                onClick={handleClearAll}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#10182b] hover:bg-rose-500/20 border border-[#26314a] hover:border-rose-500/30 rounded-xl text-xs text-slate-300 hover:text-rose-200 font-medium transition-colors cursor-pointer"
                title="Clear prompt and reference image"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* Reference Image Upload Area (Supports JPG, JPEG, PNG, WEBP) */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5 text-[#8c83ff]" />
              Reference Image for Image-to-Image (Optional):
            </span>
            <span className="text-[11px] text-slate-400 font-normal">
              JPG, JPEG, PNG, WEBP (Max 10MB)
            </span>
          </label>

          {!uploadedImage ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-5 sm:p-6 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-[#8c83ff] bg-[#7768ed]/10 scale-[1.01]'
                  : 'border-[#2e3b5e] hover:border-[#7768ed] bg-[#0d1528]/80 hover:bg-[#121c33]'
              }`}
            >
              <div className="w-12 h-12 mx-auto rounded-xl bg-[#1b2542] border border-[#2e3c63] flex items-center justify-center text-[#8c83ff] mb-3 shadow-inner">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-200">
                Click to browse or drag & drop a reference image here
              </p>
              <p className="text-xs text-slate-400 mt-1">
                The AI analyzes and preserves the subject's identity, face, clothing, and colors while applying your prompt
              </p>
            </div>
          ) : (
            /* Uploaded Image Preview & Options Card */
            <div className="bg-[#0d1528] border border-[#2b3856] rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-inner">
              <div className="flex items-center gap-3.5 w-full sm:w-auto">
                <div className="relative group shrink-0">
                  <img
                    src={uploadedImage.dataUrl}
                    alt={uploadedImage.name}
                    className="w-16 h-16 object-cover rounded-lg border border-[#3b476e] shadow-md"
                  />
                  <div className="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <FileImage className="w-4 h-4 text-white" />
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white truncate max-w-[200px] sm:max-w-xs">
                      {uploadedImage.name}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#242c4b] text-[#b9b0ff]">
                      {uploadedImage.mimeType.split('/')[1]?.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Size: {formatFileSize(uploadedImage.size)} • Subject & composition locked for reference
                  </div>
                </div>
              </div>

              {/* Replace and Remove actions */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#151f36] hover:bg-[#202947] border border-[#2e3b5e] text-xs font-medium text-slate-200 hover:text-white transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3 text-[#8c83ff]" />
                  <span>Replace</span>
                </button>
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-xs font-medium text-rose-300 hover:text-rose-200 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3 h-3 text-rose-400" />
                  <span>Remove</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Text Prompt Input */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              {uploadedImage ? 'Transformation / Modification Instructions:' : 'Detailed Visual Description:'}
            </label>
            <span className="text-[11px] text-slate-400">
              {prompt.length} characters
            </span>
          </div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={
              uploadedImage
                ? "Describe what changes or environment to apply (e.g. 'Place this person in a futuristic Tokyo garden at twilight, wearing a black leather jacket')..."
                : "Describe your subject, scene, environment, lighting, colors, and camera angle in vivid detail..."
            }
            rows={3}
            className="w-full bg-[#0d1528] border border-[#35415f] focus:border-[#7768ed] text-white placeholder:text-slate-500 p-3.5 rounded-xl outline-none resize-none text-sm transition-colors"
          />
        </div>

        {/* 8 Required Styles & Aspect Ratio Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Style Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-[#8c83ff]" />
                Artistic Style:
              </span>
              <span className="text-[11px] text-slate-400 truncate max-w-[200px]">
                {STYLE_DESCRIPTIONS[style] || ''}
              </span>
            </label>
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              className="w-full bg-[#0d1528] border border-[#35415f] text-slate-200 p-2.5 rounded-xl text-xs outline-none focus:border-[#7768ed] cursor-pointer"
            >
              {STYLES.map((s) => (
                <option key={s} value={s} className="bg-[#10182b]">
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Aspect Ratio Selector (1:1, 16:9, 9:16, 4:3, 3:4) */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
              <Ratio className="w-3.5 h-3.5 text-[#8c83ff]" />
              Aspect Ratio:
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {ASPECT_RATIOS.map((ar) => (
                <button
                  key={ar.id}
                  onClick={() => setAspectRatio(ar.id)}
                  type="button"
                  className={`py-2 px-1 text-center rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                    aspectRatio === ar.id
                      ? 'bg-[#7768ed] text-white border-[#8c83ff] shadow-sm'
                      : 'bg-[#0d1528] text-slate-400 border-[#26314a] hover:bg-[#1a233d]'
                  }`}
                >
                  <div className="text-sm">{ar.icon}</div>
                  <div className="text-[10px] mt-0.5">{ar.id}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Inspiration Preset Chips */}
        <div>
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            {uploadedImage ? 'Reference Transformation Ideas:' : 'Creative Inspiration Ideas:'}
          </div>
          <div className="flex flex-wrap gap-2">
            {(uploadedImage ? MULTIMODAL_PRESETS : TEXT_PRESETS).map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setPrompt(p)}
                className="text-left px-2.5 py-1.5 rounded-lg bg-[#10182b] hover:bg-[#202947] border border-[#26314a] text-xs text-slate-300 hover:text-white transition-colors truncate max-w-xs cursor-pointer"
              >
                "{p}"
              </button>
            ))}
          </div>
        </div>

        {/* Error notification banner with clear explanation & Retry button */}
        {errorMsg && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <div>
                <span className="font-semibold text-rose-200">Generation Error: </span>
                <span>{errorMsg}</span>
                {isQuotaError && (
                  <div className="mt-1.5 text-slate-300 text-[11px] leading-relaxed">
                    Tip: Google AI Studio image models requires an API key associated with a Google Cloud billing account. You can configure your key in <strong>Settings &gt; Secrets</strong>.
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={handleGenerate}
              disabled={isLoading}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-100 border border-rose-500/40 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Generate Button & Progress Indicator */}
        <div>
          <button
            onClick={handleGenerate}
            disabled={isLoading || (!prompt.trim() && !uploadedImage)}
            className="w-full py-3.5 bg-gradient-to-r from-[#7768ed] to-[#9487ff] hover:from-[#8878ff] hover:to-[#a5b4fc] disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-lg shadow-[#7768ed]/20 flex items-center justify-center gap-2 cursor-pointer text-sm"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{loadingStep || 'Synthesizing with Gemini AI...'}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>{uploadedImage ? 'Generate Image from Reference' : 'Generate High-Quality Image'}</span>
              </>
            )}
          </button>

          {/* Staged progress bar animation */}
          {isLoading && (
            <div className="mt-3 space-y-1.5">
              <div className="w-full bg-[#0d1528] rounded-full h-1.5 overflow-hidden border border-[#2b3856]">
                <div className="bg-gradient-to-r from-[#7768ed] to-[#9487ff] h-full rounded-full animate-pulse w-3/4 transition-all duration-700" />
              </div>
              <div className="text-[11px] text-center text-slate-400 flex items-center justify-center gap-1.5">
                <Sparkles className="w-3 h-3 text-[#8c83ff] animate-spin" />
                <span>{loadingStep || 'Processing professional visual synthesis...'}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Featured / Currently Generated Artwork */}
      {currentImage && (
        <div className="bg-[#151f36] border border-[#2b3856] rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#26314a]">
            <div>
              <div className="flex items-center gap-2 text-xs text-[#8c83ff] font-semibold uppercase tracking-wider mb-1">
                <span>{currentImage.style}</span>
                <span>•</span>
                <span className="text-slate-400">{currentImage.aspectRatio}</span>
                {currentImage.modelUsed && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#242c4b] text-[#b9b0ff]">
                    {currentImage.modelUsed}
                  </span>
                )}
                {currentImage.uploadedImageName && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#1d2744] text-[#a5b4fc] border border-[#2e3b60]">
                    From: {currentImage.uploadedImageName}
                  </span>
                )}
              </div>
              <p className="text-sm font-medium text-white italic">"{currentImage.prompt}"</p>
            </div>

            {/* Action buttons (Copy, Enlarge, Regenerate, Download) */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => handleCopyPrompt(currentImage.prompt)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#10182b] hover:bg-[#202947] text-xs font-medium text-slate-300 border border-[#26314a] transition-colors cursor-pointer"
                title="Copy prompt text"
              >
                {copiedPrompt ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedPrompt ? 'Copied' : 'Prompt'}</span>
              </button>

              <button
                onClick={() => setLightboxImage(currentImage)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#10182b] hover:bg-[#202947] text-xs font-medium text-slate-300 border border-[#26314a] transition-colors cursor-pointer"
                title="View full resolution"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Preview</span>
              </button>

              <button
                onClick={handleGenerate}
                disabled={isLoading}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#10182b] hover:bg-[#202947] text-xs font-medium text-slate-300 border border-[#26314a] transition-colors cursor-pointer"
                title="Regenerate with current settings"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#8c83ff]" />
                <span>Regenerate</span>
              </button>

              <button
                onClick={() => handleDownloadImage(currentImage)}
                className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-[#7768ed] hover:bg-[#8878ff] text-xs font-medium text-white shadow-md transition-colors cursor-pointer"
                title="Download high-resolution image"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </button>
            </div>
          </div>

          {/* Image Display */}
          <div className="relative group rounded-xl overflow-hidden bg-[#0d1528] flex items-center justify-center max-h-[640px] border border-[#26314a]">
            <img
              src={currentImage.imageUrl}
              alt={currentImage.prompt}
              className="max-h-[620px] w-auto max-w-full object-contain rounded-lg shadow-2xl transition-transform duration-300 group-hover:scale-[1.005]"
            />
          </div>
        </div>
      )}

      {/* Gallery of previously generated images in session */}
      {images.length > 1 && (
        <div className="bg-[#151f36] border border-[#2b3856] rounded-2xl p-5">
          <div className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#8c83ff]" />
            Session Gallery ({images.length})
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {images.map((item) => (
              <div
                key={item.id}
                onClick={() => setCurrentImage(item)}
                className={`group relative rounded-xl overflow-hidden border cursor-pointer aspect-square bg-[#0d1528] transition-all ${
                  currentImage?.id === item.id
                    ? 'border-[#8c83ff] ring-2 ring-[#8c83ff]/40'
                    : 'border-[#26314a] hover:border-[#7768ed]'
                }`}
              >
                <img
                  src={item.imageUrl}
                  alt={item.prompt}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2.5 flex flex-col justify-end">
                  <div className="text-[10px] text-white font-medium line-clamp-2">
                    {item.prompt}
                  </div>
                  <div className="text-[9px] text-[#8c83ff] mt-0.5">{item.style}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full-Screen Lightbox Modal for Preview & Inspection */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative max-w-5xl max-h-[92vh] bg-[#10182b] border border-[#26314a] rounded-2xl p-4 overflow-hidden flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-[#26314a]">
              <div className="text-xs text-white font-medium truncate max-w-xl">
                {lightboxImage.prompt}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadImage(lightboxImage)}
                  className="p-1.5 rounded-lg bg-[#7768ed] hover:bg-[#8878ff] text-white transition-colors cursor-pointer flex items-center gap-1 text-xs px-3"
                  title="Download Image"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
                <button
                  onClick={() => setLightboxImage(null)}
                  className="p-1.5 rounded-lg bg-[#151f36] hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-[#26314a] cursor-pointer"
                  title="Close preview"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto flex items-center justify-center p-2">
              <img
                src={lightboxImage.imageUrl}
                alt={lightboxImage.prompt}
                className="max-h-[78vh] w-auto max-w-full object-contain rounded-lg shadow-2xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
