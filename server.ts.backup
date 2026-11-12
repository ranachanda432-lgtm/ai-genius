import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '20mb' }));

// Shared Gemini client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
  });
});




// Helper to normalize and sanitize multi-turn conversation history for Gemini API
function normalizeChatContents(messages: Array<{ role: string; content?: string }>) {
  const cleanMessages: Array<{ role: 'user' | 'model'; text: string }> = [];

  for (const m of messages) {
    const rawText = (m.content || '').trim();
    if (!rawText) continue;
    // Discard any frontend error bubbles from the history
    if (rawText.startsWith('⚠️') || rawText.startsWith('Error:')) continue;

    const role: 'user' | 'model' =
      m.role === 'assistant' || m.role === 'model' ? 'model' : 'user';

    // Gemini requires alternating roles; merge consecutive same-role messages
    if (cleanMessages.length > 0 && cleanMessages[cleanMessages.length - 1].role === role) {
      cleanMessages[cleanMessages.length - 1].text += `\n\n${rawText}`;
    } else {
      cleanMessages.push({ role, text: rawText });
    }
  }

  // Gemini conversation must start with a 'user' turn
  while (cleanMessages.length > 0 && cleanMessages[0].role !== 'user') {
    cleanMessages.shift();
  }

  // Gemini conversation must end with a 'user' turn
  while (cleanMessages.length > 0 && cleanMessages[cleanMessages.length - 1].role !== 'user') {
    cleanMessages.pop();
  }

  // Fallback if cleaning stripped everything
  if (cleanMessages.length === 0) {
    const lastValidText = [...messages].reverse().find((m) => (m.content || '').trim());
    return [
      {
        role: 'user' as const,
        parts: [{ text: (lastValidText?.content || 'Hello').trim() }],
      },
    ];
  }

  return cleanMessages.map((m) => ({
    role: m.role,
    parts: [{ text: m.text }],
  }));
}

// Helper to reliably extract text from Gemini response
function extractResponseText(response: any): string {
  if (response?.text && typeof response.text === 'string') {
    return response.text;
  }
  const parts = response?.candidates?.[0]?.content?.parts;
  if (Array.isArray(parts)) {
    const textParts = parts
      .map((p: any) => p.text || '')
      .filter(Boolean)
      .join('\n\n')
      .trim();
    if (textParts) return textParts;
  }
  return '';
}

// Circuit breaker tracking degraded models during upstream spikes
const modelCoolDowns: Record<string, number> = {};

function getActiveModelOrder(preferredModel = 'gemini-3.8-flash') {
  const isPreferredDegraded =
    modelCoolDowns[preferredModel] && Date.now() < modelCoolDowns[preferredModel];

  if (isPreferredDegraded) {
    console.log(`[CircuitBreaker] ${preferredModel} is cooling down. Routing to gemini-3.1-flash-lite.`);
    return [
      { name: 'gemini-3.1-flash-lite', timeoutMs: 25000 },
      { name: preferredModel, timeoutMs: 8000 },
    ];
  }

  return [
    { name: preferredModel, timeoutMs: 8000 },
    { name: 'gemini-3.1-flash-lite', timeoutMs: 25000 },
  ];
}

// Resilient content generator with fast fallback for temporary upstream 503 demand spikes or timeouts
async function generateContentWithFallback(params: {
  contents: any;
  config?: any;
  preferredModel?: string;
}) {
  const preferred = params.preferredModel || 'gemini-3.8-flash';
  const models = getActiveModelOrder(preferred);
  let lastError: any = null;

  for (const item of models) {
    let timer: NodeJS.Timeout | undefined;
    try {
      console.log(`[generateContentWithFallback] Attempting ${item.name} (timeout ${item.timeoutMs}ms)`);

      const timeoutPromise = new Promise((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`Model ${item.name} timed out after ${item.timeoutMs}ms`));
        }, item.timeoutMs);
      });

      const callPromise = ai.models.generateContent({
        model: item.name,
        contents: params.contents,
        config: params.config,
      });

      const response: any = await Promise.race([callPromise, timeoutPromise]);
      if (timer) clearTimeout(timer);

      const extracted = extractResponseText(response);
      if (extracted) {
        console.log(`[generateContentWithFallback] Succeeded with ${item.name}`);
        if (item.name === preferred) {
          delete modelCoolDowns[preferred];
        }
        return { text: extracted };
      }
    } catch (err: any) {
      if (timer) clearTimeout(timer);
      lastError = err;
      const errMsg = err?.message || String(err);
      console.warn(`[generateContentWithFallback] ${item.name} failed:`, errMsg);

      // If preferred model hit 503, high demand, or timeout, mark for 2-minute cooldown
      if (item.name === preferred && (errMsg.includes('503') || errMsg.includes('demand') || errMsg.includes('timed out'))) {
        modelCoolDowns[preferred] = Date.now() + 120_000;
        console.log(`[CircuitBreaker] Placed ${preferred} on 2-minute cooldown`);
      }
      continue;
    }
  }

  throw lastError || new Error('All available AI models failed to produce a response.');
}

// Streaming Chat endpoint (Server-Sent Events for instant Time-To-First-Token)
app.post('/api/chat/stream', async (req, res) => {
  try {
    const { messages, systemInstruction } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required.' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY is not configured in the environment.',
      });
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const formattedContents = normalizeChatContents(messages);

    // gemini-3.1-flash-lite delivers blazing-fast streaming with zero 503 high-demand stalls
    const streamModels = ['gemini-3.1-flash-lite', 'gemini-3.8-flash'];
    let streamSuccess = false;

    for (const model of streamModels) {
      try {
        console.log(`[ChatStream] Streaming with model: ${model}`);
        const stream = await ai.models.generateContentStream({
          model,
          contents: formattedContents,
          config: {
            systemInstruction:
              systemInstruction ||
              'You are AI Genius, an elite, friendly, and ultra-capable smart AI assistant. Provide helpful, accurate, well-structured, and engaging answers. Use clean Markdown formatting with clear headings, bullet points, and code blocks where applicable.',
          },
        });

        for await (const chunk of stream) {
          const text = chunk.text;
          if (text) {
            res.write(`data: ${JSON.stringify({ text })}\n\n`);
          }
        }

        streamSuccess = true;
        res.write('data: [DONE]\n\n');
        res.end();
        break;
      } catch (streamErr: any) {
        console.warn(`[ChatStream] Model ${model} failed:`, streamErr?.message || streamErr);
        if (res.writableEnded) break;
      }
    }

    if (!streamSuccess && !res.writableEnded) {
      res.write(`data: ${JSON.stringify({ error: 'Failed to stream response from AI service. Please retry.' })}\n\n`);
      res.end();
    }
  } catch (error: any) {
    console.error('Chat Stream API Error:', error);
    if (!res.headersSent) {
      return res.status(500).json({ error: error?.message || 'Failed to initialize chat stream.' });
    } else if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ error: error?.message || 'Streaming error occurred.' })}\n\n`);
      res.end();
    }
  }
});

// Non-streaming Chat endpoint (fallback)
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, systemInstruction } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required.' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY is not configured in the environment.',
      });
    }

    // Normalize and sanitize contents to conform strictly to Gemini multi-turn format
    const formattedContents = normalizeChatContents(messages);

    const response = await generateContentWithFallback({
      preferredModel: 'gemini-3.1-flash-lite',
      contents: formattedContents,
      config: {
        systemInstruction:
          systemInstruction ||
          'You are AI Genius, an elite, friendly, and ultra-capable smart AI assistant. Provide helpful, accurate, well-structured, and engaging answers. Use clean Markdown formatting with clear headings, bullet points, and code blocks where applicable.',
      },
    });

    const reply = response.text || 'I apologize, but I could not generate a response.';
    return res.json({ reply });
  } catch (error: any) {
    console.error('Chat API Error:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to process chat request. Please try again.',
    });
  }
});

// Story Writer endpoint
app.post('/api/story', async (req, res) => {
  try {
    const { prompt, genre, tone, length, chapterTitle } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Story prompt is required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY is not configured in the environment.',
      });
    }

    const systemPrompt = `You are an award-winning creative fiction author and master storyteller at AI Genius.
Your goal is to write captivating, vividly descriptive, and immersive stories.
Target Genre: ${genre || 'General Fiction'}
Target Tone/Atmosphere: ${tone || 'Compelling & Imaginative'}
Length Target: ${length || 'Medium (around 600 words)'}
${chapterTitle ? `Chapter Title or Section: ${chapterTitle}` : ''}

Format the response in rich markdown:
- Start with a compelling title in # Title
- Include chapter or section headings if appropriate
- Maintain rich sensory descriptions, lively dialogue, strong pacing, and emotional resonance.`;

    const response = await generateContentWithFallback({
      preferredModel: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: [{ text: `Create a story based on this premise:\n${prompt}` }],
        },
      ],
      config: {
        systemInstruction: systemPrompt,
      },
    });

    const story = response.text || 'Failed to generate story.';
    return res.json({ story });
  } catch (error: any) {
    console.error('Story API Error:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to generate story.',
    });
  }
});

// Code Generator endpoint
app.post('/api/code', async (req, res) => {
  try {
    const { prompt, language, framework } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Code prompt is required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY is not configured in the environment.',
      });
    }

    const systemPrompt = `You are AI Genius Code Architect, a world-class senior software engineer and polyglot developer.
You produce clean, modern, well-typed, production-ready code with excellent architecture and safety.
Language/Framework requested: ${language || 'JavaScript/TypeScript'} ${framework ? `(${framework})` : ''}

Instructions:
1. Provide a direct, complete, runnable code solution.
2. Put the primary code in standard markdown code fences with the language identifier (e.g. \`\`\`${language?.toLowerCase() || 'typescript'}).
3. If generating HTML/CSS/JavaScript web code, make it self-contained with Tailwind CSS or clean CSS so it can be previewed directly.
4. After the code block, provide a concise "Key Highlights & How It Works" breakdown.`;

    const response = await generateContentWithFallback({
      preferredModel: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: [{ text: `Generate code for the following specification:\n${prompt}` }],
        },
      ],
      config: {
        systemInstruction: systemPrompt,
      },
    });

    const result = response.text || '';
    return res.json({ result });
  } catch (error: any) {
    console.error('Code API Error:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to generate code.',
    });
  }
});

// Style presets for professional visual aesthetics
const STYLE_PRESETS: Record<string, string> = {
  'Realistic Photography':
    'shot on 35mm lens, f/1.8 aperture, natural volumetric lighting, photorealistic textures, hyper-detailed, authentic human skin tones and reflections, 8K UHD, award-winning photography',
  '3D Cartoon':
    'stylized 3D animated character render, Pixar and DreamWorks animation aesthetic, vibrant smooth lighting, sub-surface scattering, expressive features, playful detailed textures, 3D octane render',
  'Anime':
    'high-end contemporary Japanese anime aesthetic, Makoto Shinkai style, crisp cel-shaded lines, expressive eyes, vibrant atmospheric lighting, gorgeous scenic backgrounds',
  'Cinematic':
    'dramatic Hollywood cinematic movie still, anamorphic widescreen cinematography, 35mm film grain, moody directional lighting, rim light, shallow depth of field, color graded master shot',
  'Fantasy':
    'epic high-fantasy digital illustration, magical ethereal atmosphere, glowing ambient particles, grand mythical scale, intricate clothing and armor, legendary concept art, trending on ArtStation',
  'Product Photography':
    'commercial studio product photography, clean subtle gradient backdrop, softbox studio key lighting, crystal-clear reflections, razor-sharp focus on product details, premium catalog look',
  'Logos':
    'vector-inspired modern iconic logo emblem, clean geometric lines, iconic visual motif, flat minimal elegance, high contrast, professional brand identity design on clean background',
  'Digital Art':
    'detailed digital concept art masterpiece, painterly brushwork, dynamic composition, dramatic perspective, rich color depth, trending digital painting',
};

// Image Generator endpoint (Supports text prompts, multimodal reference image uploads, 8 styles, and aspect ratios)
app.post('/api/image', async (req, res) => {
  try {
    const { prompt, aspectRatio, style = 'Realistic Photography', uploadedImage } = req.body;

    const trimmedPrompt = (prompt || '').trim();

    if (!trimmedPrompt && !uploadedImage?.dataUrl) {
      return res.status(400).json({ error: 'Please provide a text prompt or upload a reference image.' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY is not configured in the environment.',
      });
    }

    // Validate uploaded reference image if provided
    let cleanBase64: string | null = null;
    let imageMimeType = 'image/png';

    if (uploadedImage?.dataUrl) {
      const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      imageMimeType = (uploadedImage.mimeType || 'image/png').toLowerCase();

      if (!allowedMimes.includes(imageMimeType)) {
        return res.status(400).json({
          error: 'Unsupported image format. Allowed formats are JPG, JPEG, PNG, and WEBP.',
        });
      }

      const base64Str = uploadedImage.dataUrl.replace(/^data:[^;]+;base64,/, '');
      cleanBase64 = base64Str;
      const approxSizeBytes = (base64Str.length * 3) / 4;
      const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

      if (approxSizeBytes > MAX_SIZE_BYTES) {
        return res.status(400).json({
          error: 'Uploaded image file exceeds the 10MB size limit. Please upload a smaller file.',
        });
      }
    }

    // Aspect ratio validation (1:1, 16:9, 9:16, 4:3, 3:4)
    const validAspectRatios = ['1:1', '16:9', '9:16', '4:3', '3:4'];
    const selectedAspectRatio = validAspectRatios.includes(aspectRatio) ? aspectRatio : '1:1';

    // Style prompt enrichment
    const styleModifier = STYLE_PRESETS[style] || STYLE_PRESETS['Realistic Photography'];

    // Construct request parts
    const parts: any[] = [];

    if (cleanBase64) {
      // Image-to-Image mode: preserve reference subject's identity, face, clothing, colors, and composition
      parts.push({
        inlineData: {
          data: cleanBase64,
          mimeType: imageMimeType,
        },
      });

      const instruction = trimmedPrompt
        ? `Carefully analyze and use this reference image as the primary visual source. Preserve the original subject's identity, facial features, clothing, colors, composition, and key details from the reference image, while incorporating the following user instructions: "${trimmedPrompt}". Style: ${style}. ${styleModifier}. Produce a realistic, detailed, sharp, high-resolution result with professional lighting and natural textures.`
        : `Carefully analyze this reference image. Reimagine and enhance it with hyper-realistic fidelity, professional studio lighting, sharp focus, natural textures, and pristine composition. Style: ${style}. ${styleModifier}. Preserve the subject's identity, clothing, colors, and core composition.`;

      parts.push({ text: instruction });
    } else {
      // Text-to-Image mode: accurately match requested subject, objects, colors, background, and scene
      const fullPrompt = `Create a stunning, high-quality, professional image: "${trimmedPrompt}". Accurately render all requested subjects, objects, colors, background, and scene elements without omitting details. Style: ${style}. ${styleModifier}. Professional lighting, natural textures, accurate proportions, sharp focus, and beautiful composition.`;

      parts.push({ text: fullPrompt });
    }

    // Official image generation models per @google/genai guidelines
    const modelsToAttempt = ['gemini-3.1-flash-lite-image', 'gemini-nano-banana-2.1'];
    let generatedImageUrl: string | null = null;
    let modelUsed = '';
    let lastError: any = null;

    for (const model of modelsToAttempt) {
      try {
        console.log(`[ImageGen] Generating image with official model: ${model} (aspectRatio: ${selectedAspectRatio})...`);
        const response = await ai.models.generateContent({
          model,
          contents: { parts },
          config: {
            imageConfig: {
              aspectRatio: selectedAspectRatio,
            },
          },
        });

        for (const part of response.candidates?.[0]?.content?.parts ?? []) {
          if (part.inlineData?.data) {
            const base64Data: string = part.inlineData.data;
            const mime = part.inlineData.mimeType || 'image/png';
            generatedImageUrl = `data:${mime};base64,${base64Data}`;
            modelUsed = model;
            break;
          }
        }

        if (generatedImageUrl) {
          console.log(`[ImageGen] Successfully generated image with ${model}`);
          break;
        }
      } catch (err: any) {
        lastError = err;
        const msg = err?.message || String(err);
        console.warn(`[ImageGen] Model ${model} returned error:`, msg.slice(0, 150));
      }
    }

    if (!generatedImageUrl) {
      const errMsg = lastError?.message || 'Model returned no image data.';
      const isQuota =
        errMsg.includes('429') ||
        errMsg.includes('RESOURCE_EXHAUSTED') ||
        errMsg.includes('quota') ||
        errMsg.includes('Free Tier');

      if (isQuota) {
        return res.status(429).json({
          error:
            'API Quota Exceeded: Gemini image generation models (gemini-3.1-flash-lite-image) require a billing-enabled API key in Google AI Studio. Please attach a billing-enabled key in Settings > Secrets to generate images.',
          isQuotaError: true,
        });
      }

      return res.status(500).json({
        error: `Image generation failed: ${errMsg}`,
      });
    }

    return res.json({
      imageUrl: generatedImageUrl,
      prompt: trimmedPrompt || (uploadedImage ? `Enhanced: ${uploadedImage.name}` : 'Generated artwork'),
      style,
      aspectRatio: selectedAspectRatio,
      modelUsed,
    });
  } catch (error: any) {
    console.error('Image API Error:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to generate image. Please try again.',
    });
  }
});

// Mount Vite or static server
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
  });
}

startServer();
