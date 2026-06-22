import React, { useState, useEffect, useRef } from 'react';
import {
  Menu,
  Sparkles,
  Mic,
  Plus,
  Send,
  Trash2,
  Settings as SettingsIcon,
  ChevronRight,
  Terminal,
  RefreshCw,
  Cpu,
  CornerDownLeft,
  MessageSquare,
  AlertCircle,
  Copy,
  Check,
  Code,
  Volume2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Sidebar from './components/Sidebar';
import SettingsModal from './components/SettingsModal';
import { ChatSession, Message, Settings } from './types';

// Default prompt suggestions mimicking the reference layout
const SUGGESTIONS = [
  { id: 'android', label: 'Build an Android app', text: 'Create a specification for a Kotlin task companion App with responsive UI' },
  { id: 'drive', label: 'Google Drive', text: 'Integrate the Google Drive API to download and backup system assets' },
  { id: 'sheets', label: 'Google Sheets', text: 'Generate an Apps Script function to synchronize n8n webhook payload with sheets' },
  { id: 'gmail', label: 'Gmail', text: 'Draft a professional introduction email requesting access to third-party CRM APIs' },
  { id: 'calendar', label: 'Google Calendar', text: 'Find time conflicts and automate standard n8n calendar updates' },
  { id: 'n8n', label: 'n8n Integration', text: 'Show me detailed examples of formatting JSON output replies for n8n Webhook Nodes' },
];

export default function App() {
  // Sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Settings state
  const [settings, setSettings] = useState<Settings>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('chat_settings');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (_) {
          // ignore
        }
      }
    }
    return {
      n8nWebhookUrl: '',
      isN8NEnabled: false,
    };
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Chat sessions state
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('chat_sessions');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (_) {
          // ignore
        }
      }
    }
    return [];
  });

  const [activeSessionId, setActiveSessionId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('active_session_id');
      return saved || null;
    }
    return null;
  });

  // Current Input & loading states
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [micActive, setMicActive] = useState(false);
  const [sysStatus, setSysStatus] = useState<'idle' | 'writing' | 'error'>('idle');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Persistence hooks
  useEffect(() => {
    localStorage.setItem('chat_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('chat_sessions', JSON.stringify(sessions));
    if (sessions.length > 0 && !activeSessionId) {
      setActiveSessionId(sessions[0].id);
    }
  }, [sessions]);

  useEffect(() => {
    if (activeSessionId) {
      localStorage.setItem('active_session_id', activeSessionId);
    } else {
      localStorage.removeItem('active_session_id');
    }
  }, [activeSessionId]);

  // Scroll to bottom on updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sessions, activeSessionId, isLoading]);

  // Automatic adaptive dark mode setting based on system preferences/existing cache
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      const root = document.documentElement;
      if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }, []);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || null;

  // Handler for saving settings
  const handleSaveSettings = (newSettings: Settings) => {
    setSettings(newSettings);
    setIsSettingsOpen(false);
  };

  // Create a new session
  const handleNewChat = () => {
    const newSession: ChatSession = {
      id: crypto.randomUUID(),
      title: 'New Conversation',
      messages: [],
      createdAt: Date.now(),
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
  };

  // Delete session
  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (activeSessionId === id) {
      const remaining = sessions.filter((s) => s.id !== id);
      setActiveSessionId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  // Select active session
  const handleSelectSession = (id: string) => {
    setActiveSessionId(id);
  };

  // Handle message submission
  const handleSendMessage = async (textToSend?: string) => {
    const rawText = textToSend || inputText;
    if (!rawText.trim() || isLoading) return;

    let currentSessionId = activeSessionId;
    let targetSession = activeSession;

    // Create session on-demand if none exists
    if (!currentSessionId || !targetSession) {
      const newSessionId = crypto.randomUUID();
      const newSession: ChatSession = {
        id: newSessionId,
        title: rawText.length > 30 ? rawText.substring(0, 30) + '...' : rawText,
        messages: [],
        createdAt: Date.now(),
      };
      setSessions((prev) => [newSession, ...prev]);
      setActiveSessionId(newSessionId);
      currentSessionId = newSessionId;
      targetSession = newSession;
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: rawText,
      timestamp: Date.now(),
    };

    // Update locally with User request
    const updatedMessages = [...(targetSession?.messages || []), userMessage];
    
    // Automatically name Title after first message if it's generic
    const isNewTitleNeeded = targetSession?.title === 'New Conversation' || !targetSession?.title;
    const computedTitle = isNewTitleNeeded 
      ? (rawText.length > 40 ? rawText.substring(0, 40) + '...' : rawText)
      : targetSession!.title;

    setSessions((prev) =>
      prev.map((s) =>
        s.id === currentSessionId
          ? { ...s, title: computedTitle, messages: updatedMessages }
          : s
      )
    );

    if (!textToSend) {
      setInputText('');
    }
    
    setIsLoading(true);
    setSysStatus('writing');

    try {
      // Build response payload, bypassing CORS with local server proxy API endpoint
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: rawText,
          history: updatedMessages.slice(0, -1), // skip adding the newly appended user message to history
          n8nWebhookUrl: settings.n8nWebhookUrl,
          isN8NEnabled: settings.isN8NEnabled,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server API status error: ${response.status}`);
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.output || "I'm sorry, I couldn't formulate a proper response.",
        timestamp: Date.now(),
      };

      setSessions((prev) =>
        prev.map((s) =>
          s.id === currentSessionId
            ? { ...s, messages: [...s.messages, assistantMessage] }
            : s
        )
      );
      setSysStatus('idle');
    } catch (err: any) {
      console.error('Chat routing error:', err);
      setSysStatus('error');
      
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'system',
        content: `Error routing message: ${err.message || 'Check network connection'}. Make sure your connection config is valid.`,
        timestamp: Date.now(),
      };

      setSessions((prev) =>
        prev.map((s) =>
          s.id === currentSessionId
            ? { ...s, messages: [...s.messages, errorMessage] }
            : s
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, messageId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(messageId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleMicToggle = () => {
    setMicActive(!micActive);
    if (!micActive) {
      // Speak visual cue or notify
      setInputText('Speech-to-text placeholder activated...');
    }
  };

  return (
    <div id="app-root-container" className="flex h-screen w-screen overflow-hidden bg-white dark:bg-slate-900 font-sans transition-colors duration-200">
      {/* Sidebar Component */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        onDeleteSession={handleDeleteSession}
        isN8NConnected={settings.isN8NEnabled && !!settings.n8nWebhookUrl}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Floating Menu Button for mobile view so users can open the Sidebar */}
        <button
          id="sidebar-toggle-btn"
          onClick={() => setIsSidebarOpen(true)}
          className="p-2.5 absolute top-4 left-4 rounded-xl shadow-xs bg-white text-slate-705 hover:bg-slate-50 border border-slate-200/80 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800 md:hidden cursor-pointer focus:outline-none z-30 transition-all flex items-center justify-center"
          title="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Content Section */}
        <div className="flex-1 overflow-y-auto bg-slate-50/40 dark:bg-slate-900/40">
          {!activeSession || activeSession.messages.length === 0 ? (
            /* Welcome Empty Stage mimicking reference screenshot */
            <div className="max-w-4xl mx-auto px-4 pt-12 pb-24 h-full flex flex-col justify-center items-center">
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="text-center space-y-3 mb-10"
              >
                <div className="relative inline-block">
                  <h2 className="font-display font-medium text-3xl sm:text-4xl text-slate-800 dark:text-slate-100 leading-tight tracking-tight flex items-center justify-center gap-2">
                    Ask me Anything
                    {/* Floating Sparkle Icon */}
                    <div className="relative inline-block w-8 h-8 select-none">
                      <Sparkles className="w-8 h-8 text-cyan-400 absolute animate-pulse-slow top-0 right-0" />
                    </div>
                  </h2>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
                  A high-fidelity developer workspace. Ask questions, route logic directly to your custom n8n setup, or build responsive workflows.
                </p>
              </motion.div>

              {/* Glowing Gradient Message Input Card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.15 }}
                className="w-full max-w-3xl gradient-border-glow shadow-xl shadow-slate-100/50 dark:shadow-none mb-10"
              >
                <div className="bg-white dark:bg-slate-900 rounded-[23px] p-4 font-sans space-y-4">
                  {/* Textarea Input area */}
                  <textarea
                    id="welcome-prompt-input"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Describe an app and let BuzziBuddy do the rest"
                    rows={3}
                    className="w-full resize-none bg-transparent outline-none border-none text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-550 text-sm py-1.5 focus:ring-0 leading-relaxed"
                  />

                  {/* Actions Bar inside Prompt border */}
                  <div className="flex items-center justify-between border-t border-gray-100 dark:border-slate-800/80 pt-3.5">
                    <div className="flex items-center gap-1.5">
                      {/* Mic Button */}
                      <button
                        id="welcome-mic-btn"
                        onClick={handleMicToggle}
                        className={`p-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-550 dark:text-slate-400 cursor-pointer transition-colors relative ${
                          micActive ? 'bg-red-50 text-red-500 dark:bg-rose-950/30' : ''
                        }`}
                        title="Configure Speech to Text"
                      >
                        <Mic className="w-5 h-5" />
                        {micActive && (
                          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                        )}
                      </button>

                      {/* Info Attachment Context Pill Button */}
                      <button
                        id="welcome-attachments-btn"
                        onClick={() => handleSendMessage('Explain your n8n API configuration features in full.')}
                        className="p-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-550 dark:text-slate-400 cursor-pointer transition-colors"
                        title="Add helpful mock system contexts"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Feeling Lucky/Send Submit Button */}
                    <button
                      id="welcome-lucky-btn"
                      onClick={() => handleSendMessage()}
                      className="px-5 py-2 hover:shadow-lg hover:shadow-cyan-400/10 text-xs text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium rounded-full cursor-pointer border border-gray-200 dark:border-slate-800 transition-all flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                      <span>I'm feeling lucky</span>
                    </button>
                  </div>
                </div>
              </motion.div>

              {/* Suggestion Pills underneath Input Card */}
              <div className="w-full max-w-3xl space-y-3">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-405 dark:text-slate-500 tracking-wider inline-flex gap-1">
                  <span>SELECT A DRAFT TEMPLATE</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>

                <div className="flex gap-2 pb-2 overflow-x-auto scrollbar-none snap-x mask-gradient-x py-1">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s.id}
                      id={`suggestion-pill-${s.id}`}
                      onClick={() => handleSendMessage(s.text)}
                      className="px-4 py-2 border border-slate-200/80 dark:border-slate-800 hover:border-emerald-400/40 dark:hover:border-emerald-800 bg-white dark:bg-slate-900 text-slate-650 dark:text-slate-350 hover:text-slate-800 dark:hover:text-slate-200 text-xs font-medium rounded-full shrink-0 shadow-xs cursor-pointer select-none transition-all snap-start flex items-center gap-2"
                    >
                      <div className="w-2 h-2 rounded-full bg-emerald-500/80" />
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Active Live Thread Chat Viewport */
            <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
              <AnimatePresence initial={false}>
                {activeSession.messages.map((message) => {
                  const isUser = message.role === 'user';
                  const isSystem = message.role === 'system';

                  return (
                    <motion.div
                      key={message.id}
                      id={`chat-message-${message.id}`}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.35, ease: 'easeOut' }}
                      className={`flex gap-4 ${isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      {/* Avatar Bubble */}
                      {!isUser && (
                        <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center font-display font-semibold text-xs shadow-sm ${
                          isSystem 
                            ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-450 border border-rose-100 dark:border-rose-955' 
                            : 'bg-emerald-500 text-white'
                        }`}>
                          {isSystem ? '!' : 'B'}
                        </div>
                      )}

                      <div className={`max-w-[85%] space-y-1.5 ${isUser ? 'text-right' : 'text-left'}`}>
                        {/* Meta header */}
                        <div className="flex items-center gap-2 justify-start select-none">
                          <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono">
                            {isUser ? 'Developer' : isSystem ? 'System Diagnosis' : settings.isN8NEnabled ? 'n8n automation' : 'BuzziBuddy Assistant'}
                          </span>
                          <span className="text-[10px] text-slate-401 dark:text-slate-650">
                            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {!isUser && !isSystem && (
                            <span className="h-4 px-1.5 bg-emerald-50 dark:bg-emerald-950/45 text-emerald-600 dark:text-emerald-400 font-mono text-[9px] rounded font-semibold border border-emerald-100/40 dark:border-emerald-950/60">
                              {settings.isN8NEnabled ? 'n8n HTTP Router' : 'Direct API key'}
                            </span>
                          )}
                        </div>

                        {/* Content text layout card */}
                        <div className={`rounded-2xl p-4 text-sm shadow-xs ${
                          isUser
                            ? 'bg-slate-100 dark:bg-emerald-900/30 text-slate-800 dark:text-slate-200 border border-transparent dark:border-emerald-900/40'
                            : isSystem
                            ? 'bg-rose-50/50 dark:bg-rose-950/15 border border-rose-100/60 dark:border-rose-950/50 text-rose-700 dark:text-rose-300'
                            : 'bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800/80 text-slate-705 dark:text-slate-300'
                        }`}>
                          {/* Markdown representation pre-rendering support */}
                          <div className="prose prose-slate dark:prose-invert max-w-none text-left leading-relaxed break-words space-y-2.5 font-sans">
                            {message.content.includes('```') ? (
                              message.content.split('```').map((part, index) => {
                                if (index % 2 === 1) {
                                  // Code blocks inside response
                                  const codeLines = part.trim().split('\n');
                                  const language = codeLines[0].length < 10 ? codeLines[0] : '';
                                  const actualCode = language ? codeLines.slice(1).join('\n') : part;

                                  return (
                                    <div key={index} className="my-3 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 font-mono">
                                      <div className="p-2 bg-slate-100 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-850 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 select-none">
                                        <div className="flex items-center gap-1.5">
                                          <Code className="w-3.5 h-3.5" />
                                          <span className="uppercase text-[10px] tracking-wider">{language || 'code'}</span>
                                        </div>
                                        <button
                                          onClick={() => copyToClipboard(actualCode, message.id + index)}
                                          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors flex items-center gap-1 cursor-pointer"
                                        >
                                          {copiedId === message.id + index ? (
                                            <>
                                              <Check className="w-3 h-3 text-emerald-500" />
                                              <span className="text-[10px] text-emerald-500">Copied</span>
                                            </>
                                          ) : (
                                            <>
                                              <Copy className="w-3 h-3" />
                                              <span className="text-[10px]">Copy</span>
                                            </>
                                          )}
                                        </button>
                                      </div>
                                      <pre className="p-3 bg-slate-50 dark:bg-slate-950 text-xs overflow-x-auto text-emerald-600 dark:text-emerald-400">
                                        <code>{actualCode}</code>
                                      </pre>
                                    </div>
                                  );
                                }
                                return <p key={index} className="whitespace-pre-wrap">{part}</p>;
                              })
                            ) : (
                              <p className="whitespace-pre-wrap">{message.content}</p>
                            )}
                          </div>
                        </div>

                        {/* Speech and Actions under Assistant replies */}
                        {!isUser && !isSystem && (
                          <div className="flex items-center gap-2 mt-1 justify-start">
                            <button
                              onClick={() => {
                                // Speak content using local speech synthesis check
                                if ('speechSynthesis' in window) {
                                  window.speechSynthesis.cancel();
                                  const utterance = new SpeechSynthesisUtterance(message.content);
                                  utterance.rate = 1.0;
                                  window.speechSynthesis.speak(utterance);
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded-md transition-all cursor-pointer"
                              title="Speak out response"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => copyToClipboard(message.content, message.id)}
                              className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded-md transition-all cursor-pointer"
                              title="Copy response body"
                            >
                              {copiedId === message.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* User Avatar */}
                      {isUser && (
                        <div className="w-8 h-8 rounded-lg shrink-0 bg-slate-100 dark:bg-emerald-950/60 text-slate-700 dark:text-emerald-400 border border-slate-200 dark:border-emerald-900/60 flex items-center justify-center font-display font-semibold text-xs shadow-xs uppercase">
                          Me
                        </div>
                      )}
                    </motion.div>
                  );
                })}

                {/* Simulated/Real n8n network stream loader status */}
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-4 items-start"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white font-display font-semibold text-xs animate-bounce">
                      B
                    </div>
                    <div className="space-y-1.5 max-w-[80%]">
                      <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono">
                        {settings.isN8NEnabled ? 'Contacting n8n endpoint...' : 'Querying BuzziBuddy Standby API...'}
                      </span>
                      <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-bounce" />
                          <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-bounce delay-100" />
                          <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-bounce delay-200" />
                          <span className="text-xs text-slate-500 dark:text-slate-400 ml-2 font-mono">
                            {settings.isN8NEnabled ? 'Awaiting secure webhook feedback' : 'Executing server proxy query...'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Fixed Footer with Input Area for active threads */}
        {activeSession && activeSession.messages.length > 0 && (
          <footer className="p-4 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-t border-gray-150 dark:border-slate-800 z-10 shrink-0">
            <div className="max-w-3xl mx-auto flex items-center gap-2">
              {/* Outer Glowing Gradient wrapper */}
              <div className="flex-1 gradient-border-glow shadow-sm">
                <div className="bg-white dark:bg-slate-900 rounded-[23px] px-4 py-2 flex items-center gap-3">
                  {/* Plus Trigger context selector button */}
                  <button
                    id="active-plus-btn"
                    onClick={() => handleSendMessage('Suggest and draft high frequency action routes for n8n API integrations.')}
                    className="p-1.5 text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 rounded-lg transition-colors cursor-pointer"
                    title="Add mock setup trigger instructions"
                  >
                    <Plus className="w-5 h-5" />
                  </button>

                  {/* Textarea Input area */}
                  <input
                    id="active-chat-input"
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSendMessage();
                      }
                    }}
                    placeholder="Describe an app or ask a workflow custom instruction..."
                    className="flex-1 bg-transparent border-none outline-none font-sans text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-550 py-1"
                  />

                  {/* Submit icon pill bar */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      id="active-mic-btn"
                      onClick={handleMicToggle}
                      className={`p-1.5 rounded-full text-slate-400 hover:text-emerald-550 cursor-pointer ${
                        micActive ? 'bg-rose-50 text-rose-500 dark:bg-rose-950/20' : ''
                      }`}
                      title="Microphone input toggle"
                    >
                      <Mic className="w-4.5 h-4.5" />
                    </button>
                    
                    <button
                      id="active-send-btn"
                      onClick={() => handleSendMessage()}
                      disabled={!inputText.trim() || isLoading}
                      className={`p-2 rounded-full cursor-pointer transition-all ${
                        inputText.trim() && !isLoading
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-500/10'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-350 dark:text-slate-650'
                      }`}
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-2 text-center text-[10px] text-slate-401 dark:text-slate-500 font-mono flex items-center justify-center gap-1.5">
              <span>Automatic Failover Active: n8n ➜ BuzziBuddy Standby</span>
            </div>
          </footer>
        )}
      </div>

      {/* Settings Modal Setup */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={handleSaveSettings}
      />
    </div>
  );
}
