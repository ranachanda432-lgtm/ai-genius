/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ToolType, ChatMessage, StoryItem, CodeItem, ImageItem } from './types';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { ChatView } from './components/ChatView';
import { StoryWriterView } from './components/StoryWriterView';
import { CodeGeneratorView } from './components/CodeGeneratorView';
import { ImageGeneratorView } from './components/ImageGeneratorView';

export default function App() {
  const [currentTool, setCurrentTool] = useState<ToolType>('home');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [activeInitialPrompt, setActiveInitialPrompt] = useState('');

  // Persistent State from localStorage
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('ai_genius_chat_msgs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [stories, setStories] = useState<StoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('ai_genius_stories');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [codeItems, setCodeItems] = useState<CodeItem[]>(() => {
    try {
      const saved = localStorage.getItem('ai_genius_code');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [images, setImages] = useState<ImageItem[]>(() => {
    try {
      const saved = localStorage.getItem('ai_genius_images');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isChatLoading, setIsChatLoading] = useState(false);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('ai_genius_chat_msgs', JSON.stringify(chatMessages));
  }, [chatMessages]);

  useEffect(() => {
    localStorage.setItem('ai_genius_stories', JSON.stringify(stories));
  }, [stories]);

  useEffect(() => {
    localStorage.setItem('ai_genius_code', JSON.stringify(codeItems));
  }, [codeItems]);

  useEffect(() => {
    localStorage.setItem('ai_genius_images', JSON.stringify(images));
  }, [images]);

  // Handler for tool selection
  const handleSelectTool = (tool: ToolType, promptToPass = '') => {
    setCurrentTool(tool);
    setActiveInitialPrompt(promptToPass);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Chat message sender with real-time SSE streaming, duplicate prevention, and robust error handling
  const handleSendMessage = async (text: string, persona: string) => {
    // Prevent duplicate requests while a response is loading
    if (isChatLoading) return;

    const trimmed = text.trim();
    if (!trimmed) return;

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
      content: '', // populated as chunks stream in
      timestamp: Date.now(),
    };

    // Filter previous error messages from the history payload sent to the API
    const historyPayload = chatMessages
      .filter((m) => !m.content.startsWith('⚠️') && !m.content.startsWith('Error:'))
      .concat(userMsg);

    // Update UI immediately with user message and active streaming placeholder
    setChatMessages((prev) => [...prev, userMsg, botPlaceholderMsg]);
    setIsChatLoading(true);

    let systemInstruction =
      'You are AI Genius, an elite smart assistant. Provide articulate, well-structured, and helpful answers.';
    if (persona === 'thinker') {
      systemInstruction =
        'You are AI Genius Deep Reasoner. Approach problems step-by-step with rigorous logic, intellectual curiosity, and nuanced analysis.';
    } else if (persona === 'coder') {
      systemInstruction =
        'You are AI Genius Code Architect. Provide clean, secure, idiomatic code examples with explanations and modern best practices.';
    } else if (persona === 'writer') {
      systemInstruction =
        'You are AI Genius Creative Muse. Craft vivid, evocative, compelling prose and imaginative narratives.';
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);
    let accumulatedText = '';

    try {
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          messages: historyPayload.map((m) => ({ role: m.role, content: m.content })),
          systemInstruction,
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
        throw new Error('Readable stream is not supported in this browser environment.');
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
              setChatMessages((prev) =>
                prev.map((m) =>
                  m.id === botMessageId ? { ...m, content: accumulatedText } : m
                )
              );
            }
          } catch (jsonErr: any) {
            if (jsonErr.message && !jsonErr.message.includes('Unexpected')) {
              throw jsonErr;
            }
          }
        }
      }

      clearTimeout(timeoutId);

      // Fallback if stream was empty
      if (!accumulatedText.trim()) {
        setChatMessages((prev) =>
          prev.map((m) =>
            m.id === botMessageId
              ? { ...m, content: 'I apologize, but no response was generated. Please try again.' }
              : m
          )
        );
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      const isAbort = err.name === 'AbortError';
      const errorMessage = isAbort
        ? '⚠️ Request timed out. The AI model took too long to stream. Please try again.'
        : `⚠️ Error: ${err.message || 'Unable to connect to AI service. Please verify connection.'}`;

      setChatMessages((prev) =>
        prev.map((m) =>
          m.id === botMessageId
            ? { ...m, content: accumulatedText ? `${accumulatedText}\n\n${errorMessage}` : errorMessage }
            : m
        )
      );
    } finally {
      // Always reset loading state
      setIsChatLoading(false);
    }
  };

  const handleSaveStory = (story: StoryItem) => {
    setStories((prev) => [story, ...prev.filter((s) => s.id !== story.id)]);
  };

  const handleSaveCode = (item: CodeItem) => {
    setCodeItems((prev) => [item, ...prev.filter((c) => c.id !== item.id)]);
  };

  const handleSaveImage = (item: ImageItem) => {
    setImages((prev) => [item, ...prev.filter((img) => img.id !== item.id)]);
  };

  const handleClearAllHistory = () => {
    setChatMessages([]);
    setStories([]);
    setCodeItems([]);
    setImages([]);
    localStorage.removeItem('ai_genius_chat_msgs');
    localStorage.removeItem('ai_genius_stories');
    localStorage.removeItem('ai_genius_code');
    localStorage.removeItem('ai_genius_images');
  };

  const getToolTitle = () => {
    switch (currentTool) {
      case 'home':
        return 'Dashboard';
      case 'chat':
        return 'AI Chat';
      case 'story':
        return 'Story Writer';
      case 'code':
        return 'Code Generator';
      case 'image':
        return 'Image Generator';
      default:
        return 'Dashboard';
    }
  };

  const getToolTag = () => {
    switch (currentTool) {
      case 'home':
        return 'AI ASSISTANT';
      case 'chat':
        return 'CONVERSATIONAL CORE';
      case 'story':
        return 'NARRATIVE SYNTHESIS';
      case 'code':
        return 'CODE ARCHITECT';
      case 'image':
        return 'MULTIMODAL VISION';
      default:
        return 'AI ASSISTANT';
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0b1020] text-white">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTool={currentTool}
        onSelectTool={(tool) => handleSelectTool(tool)}
        isOpenMobile={isMobileNavOpen}
        onCloseMobile={() => setIsMobileNavOpen(false)}
        stats={{
          totalChats: chatMessages.filter((m) => m.role === 'user').length,
          totalStories: stories.length,
          totalCode: codeItems.length,
          totalImages: images.length,
        }}
        onClearAllHistory={handleClearAllHistory}
      />

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-7 md:p-8 min-w-0 flex flex-col justify-between">
        <div>
          {/* Header */}
          <Header
            currentTool={currentTool}
            onOpenMobileNav={() => setIsMobileNavOpen(true)}
            toolTitle={getToolTitle()}
            tagText={getToolTag()}
          />

          {/* Active View */}
          {currentTool === 'home' && (
            <Dashboard
              onSelectTool={(tool) => handleSelectTool(tool)}
              onSendQuickPrompt={(tool, prompt) => handleSelectTool(tool, prompt)}
              recentStories={stories}
              recentCode={codeItems}
              recentImages={images}
            />
          )}

          {currentTool === 'chat' && (
            <ChatView
              messages={chatMessages}
              onSendMessage={handleSendMessage}
              onClearChat={() => setChatMessages([])}
              isLoading={isChatLoading}
              initialPrompt={activeInitialPrompt}
            />
          )}

          {currentTool === 'story' && (
            <StoryWriterView
              stories={stories}
              onSaveStory={handleSaveStory}
              initialPrompt={activeInitialPrompt}
            />
          )}

          {currentTool === 'code' && (
            <CodeGeneratorView
              codeItems={codeItems}
              onSaveCodeItem={handleSaveCode}
              initialPrompt={activeInitialPrompt}
            />
          )}

          {currentTool === 'image' && (
            <ImageGeneratorView
              images={images}
              onSaveImage={handleSaveImage}
              initialPrompt={activeInitialPrompt}
            />
          )}
        </div>

        {/* Footer faithful to the user's brief */}
        <footer className="text-center text-[#69758d] text-xs mt-12 pt-6 border-t border-[#1c263e]">
          AI Genius © 2026 | Your Smart AI Workspace
        </footer>
      </main>
    </div>
  );
}
