import React from 'react';
import { Plus, Trash2, MessageSquare, Menu, X, HelpCircle, Compass, Terminal, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ChatSession } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string, e: React.MouseEvent) => void;
  isN8NConnected: boolean;
  onOpenSettings: () => void;
}

export default function Sidebar({
  isOpen,
  onClose,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  isN8NConnected,
  onOpenSettings,
}: SidebarProps) {
  return (
    <>
      {/* Mobile Backdrop overlay */}
      <AnimatePresence>
        {isOpen && (
          <div
            id="sidebar-backdrop"
            onClick={onClose}
            className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-xs md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Actual Sidebar Container */}
      <aside
        id="app-sidebar"
        className={`fixed inset-y-0 left-0 z-40 w-72 shrink-0 bg-slate-50 dark:bg-slate-950 border-r border-gray-200/80 dark:border-slate-900 flex flex-col transition-transform duration-300 md:relative md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200/80 dark:border-slate-900 bg-slate-100/50 dark:bg-slate-950/50">
            <div className="flex items-center gap-2">
              {/* Sparkle emblem mimicking standard AI chat headers */}
              <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white font-display font-bold shadow-sm shadow-emerald-500/20">
                B
              </div>
              <div className="pt-1 select-none">
                <h1 className="font-display font-semibold text-base text-slate-800 dark:text-slate-100 leading-none">
                  BuzziBuddy
                </h1>
              </div>
            </div>
          <button
            id="sidebar-close-btn-mobile"
            onClick={onClose}
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-900 rounded-full text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 md:hidden cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Create Chat Action Button */}
        <div className="p-4 shrink-0">
          <button
            id="new-chat-sidebar-btn"
            onClick={() => {
              onNewChat();
              onClose();
            }}
            className="w-full h-11 flex items-center justify-center gap-2 px-4 bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-700 dark:hover:bg-emerald-600 hover:shadow-md hover:shadow-emerald-500/10 text-white font-medium text-xs rounded-xl cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <Plus className="w-4 h-4" />
            Start New Chat
          </button>
        </div>

        {/* Sessions scrollable list */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 dark:text-slate-600 tracking-wider uppercase">
            Recent Conversations
          </div>

          <AnimatePresence initial={false}>
            {sessions.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 dark:text-slate-600 italic">
                No conversations yet. Create one above!
              </div>
            ) : (
              sessions.map((session) => {
                const isActive = activeSessionId === session.id;
                return (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -15 }}
                    className="group relative"
                  >
                    <button
                      id={`session-item-${session.id}`}
                      onClick={() => {
                        onSelectSession(session.id);
                        onClose();
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-xs transition-all duration-200 ${
                        isActive
                          ? 'bg-slate-200/70 text-slate-800 font-medium dark:bg-slate-900 dark:text-emerald-400'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/30 dark:hover:bg-slate-900/40 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      <MessageSquare className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-500' : 'text-slate-450 dark:text-slate-500'}`} />
                      <span className="truncate flex-1 pr-6">
                        {session.title || 'Untitled Session'}
                      </span>
                    </button>
                    
                    <button
                      id={`delete-session-${session.id}`}
                      onClick={(e) => onDeleteSession(session.id, e)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity cursor-pointer duration-100"
                      title="Delete chat session"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>

        {/* Sidebar Footer details */}
        <div className="p-4 border-t border-gray-200/80 dark:border-slate-900 bg-slate-100/30 dark:bg-slate-950/30 space-y-3 font-sans">
          <button
            id="sidebar-settings-btn"
            onClick={() => {
              onOpenSettings();
              onClose();
            }}
            className="w-full py-2 flex items-center justify-center gap-2.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-800 rounded-xl cursor-pointer hover:shadow-sm transition-all"
          >
            <Settings className="w-4 h-4 text-emerald-500" />
            <span>Configure n8n Webhook</span>
          </button>

          <div className="space-y-1 pt-1">
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
              <Compass className="w-4 h-4 text-emerald-500" />
              <span>Full-Stack Interface</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-400 dark:text-slate-600 font-mono">
              <Terminal className="w-3.5 h-3.5" />
              <span>Vite + Node proxy</span>
            </div>
          </div>
          <p className="text-[10px] text-slate-405 dark:text-slate-500 leading-normal text-center">
            Double-checked CORS bypass routes. Secure server-side responses.
          </p>
        </div>
      </aside>
    </>
  );
}
