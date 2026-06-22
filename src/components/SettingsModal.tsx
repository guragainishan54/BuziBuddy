import { Settings, X, Cpu, CheckCircle, Info, Link2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import React, { useState } from 'react';
import { Settings as SettingsType } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SettingsType;
  onSave: (settings: SettingsType) => void;
}

export default function SettingsModal({ isOpen, onClose, settings, onSave }: SettingsModalProps) {
  const [webhookUrl, setWebhookUrl] = useState(settings.n8nWebhookUrl);
  const [isEnabled, setIsEnabled] = useState(settings.isN8NEnabled);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      n8nWebhookUrl: webhookUrl,
      isN8NEnabled: isEnabled,
    });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1500);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div id="settings-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          {/* Modal Background click */}
          <div className="absolute inset-0" onClick={onClose} />

          <motion.div
            id="settings-modal-card"
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-slate-800 z-10"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-lg text-slate-800 dark:text-slate-100">
                    Integration Settings
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Configure your custom n8n Chatbot Webhook
                  </p>
                </div>
              </div>
              <button
                id="close-settings-btn"
                onClick={onClose}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSave} className="p-6 space-y-6">
              {/* Toggle Switch */}
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-gray-100 dark:border-slate-800/60">
                <div className="space-y-0.5">
                  <label htmlFor="n8n-toggle" className="font-medium text-sm text-slate-800 dark:text-slate-200 block">
                    Enable n8n Connection
                  </label>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Route chat conversations directly to n8n triggers
                  </span>
                </div>
                <button
                  id="n8n-toggle"
                  type="button"
                  onClick={() => setIsEnabled(!isEnabled)}
                  className={`relative inline-flex h-6.5 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                    isEnabled ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-slate-700'
                  }`}
                  role="switch"
                  aria-checked={isEnabled}
                >
                  <span
                    className={`pointer-events-none inline-block h-5.5 w-5.5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      isEnabled ? 'translate-x-5.5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Webhook Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="webhook-url" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    n8n Webhook URL
                  </label>
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-mono">
                    <Link2 className="w-3 h-3" /> POST method
                  </span>
                </div>
                <input
                  id="webhook-url"
                  type="url"
                  disabled={!isEnabled}
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://your-n8n-instance.com/webhook/chat-endpoint"
                  className={`w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border rounded-xl text-sm font-mono placeholder-slate-400 dark:placeholder-slate-600 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 ${
                    !isEnabled
                      ? 'bg-slate-50 border-gray-200 text-slate-400 dark:bg-slate-900/40 dark:border-slate-800 dark:text-slate-600'
                      : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                  required={isEnabled}
                />
              </div>

              {/* Help & Tutorial Section */}
              <div className="p-4 bg-blue-50/50 dark:bg-sky-950/20 rounded-xl border border-blue-100/30 dark:border-sky-900/30 space-y-2.5">
                <div className="flex gap-2 text-blue-700 dark:text-sky-400">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="font-medium text-xs">How do I connect n8n?</span>
                </div>
                <ol className="text-xs text-slate-600 dark:text-slate-450 list-decimal pl-4.5 space-y-1.5 leading-relaxed">
                  <li>
                    In your n8n workspace, add a <span className="font-semibold dark:text-sky-300">Webhook Node</span>. Set the HTTP Method to <span className="font-mono bg-blue-100/40 dark:bg-slate-800 px-1 py-0.5 rounded text-[10px]">POST</span>.
                  </li>
                  <li>
                    Copy the webhooks Production/Test URL and paste it into the field above.
                  </li>
                  <li>
                    The node receives a body with <code className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">{`{ message: string, history: Array }`}</code>.
                  </li>
                  <li>
                    Your n8n workflow should respond with a JSON object containing an <span className="font-mono text-blue-600 dark:text-sky-400 font-semibold">{`"output"`}</span> key representing the reply text.
                  </li>
                </ol>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  id="settings-cancel"
                  type="button"
                  onClick={onClose}
                  className="w-1/2 py-2.5 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 font-medium text-sm rounded-xl cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  id="settings-save-btn"
                  type="submit"
                  disabled={savedSuccess}
                  className="w-1/2 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/60 text-white font-medium text-sm rounded-xl cursor-pointer hover:shadow-lg hover:shadow-emerald-500/10 transition-all flex items-center justify-center gap-2"
                >
                  {savedSuccess ? (
                    <>
                      <CheckCircle className="w-4 h-4 animate-bounce" />
                      Saved Successfully!
                    </>
                  ) : (
                    <>
                      <Cpu className="w-4 h-4 animate-pulse" />
                      Apply Settings
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
