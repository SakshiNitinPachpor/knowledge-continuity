import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/api';
import { CopilotResponse } from '../types';
import {
  Bot, Send, Sparkles, FileText, CheckCircle2,
  AlertTriangle, HelpCircle, ArrowRight, ShieldCheck,
  Compass
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'copilot';
  text: string;
  citations?: any[];
  isUncertain?: boolean;
}

export const CopilotPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'copilot',
      text: "Hello! I am your Successor AI Copilot. I am strictly grounded in verified project claims and approved handover records.\n\nAsk me about upcoming priorities, technical decisions, unassigned tasks, or system risks.",
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const sampleQuestions = [
    "What should I work on first as incoming successor?",
    "What decisions were made about the primary database?",
    "Which tasks are still pending or in progress?",
    "What continuity risks and bottlenecks should I know about?",
    "Who is responsible for the external gateway integrations?"
  ];

  const handleSend = async (queryText: string) => {
    const q = queryText.trim();
    if (!q || !projectId || loading) return;

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      sender: 'user',
      text: q
    };
    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');
    setLoading(true);

    try {
      const res = await api.askCopilot(projectId, q);
      const botMsg: ChatMessage = {
        id: String(Date.now() + 1),
        sender: 'copilot',
        text: res.answer,
        citations: res.citations,
        isUncertain: res.is_uncertain
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (err: any) {
      const errMsg: ChatMessage = {
        id: String(Date.now() + 1),
        sender: 'copilot',
        text: `Error contacting knowledge assistant: ${err.message}`,
        isUncertain: true
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Title */}
      <div>
        <span className="text-xs uppercase font-bold tracking-wider text-[#B9825A] block mb-1">
          Feature 5 — Grounded Successor Assistant
        </span>
        <h1 className="text-2xl font-extrabold text-[#151923] dark:text-white flex items-center gap-2">
          <Bot className="w-6 h-6 text-purple-600" />
          Successor AI Copilot
        </h1>
        <p className="text-xs text-[#64748B] dark:text-gray-400 mt-1">
          Answers successor questions exclusively grounded in human-approved project claims. Cites exact sources and documents.
        </p>
      </div>

      {/* Suggested Inquiries */}
      <div className="p-4 rounded-3xl bg-white dark:bg-[#1B2432] border border-[#E5E1D8] dark:border-gray-800 shadow-soft">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#B9825A] block mb-2">
          Recommended Successor Prompts:
        </span>
        <div className="flex flex-wrap gap-2">
          {sampleQuestions.map((sq, i) => (
            <button
              key={i}
              onClick={() => handleSend(sq)}
              className="px-3 py-1.5 rounded-xl text-xs bg-[#F8F6F1] dark:bg-gray-800 hover:bg-[#F2EFE9] dark:hover:bg-gray-700 text-[#151923] dark:text-white border border-[#E5E1D8] dark:border-gray-700 transition text-left"
            >
              {sq}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Thread Container */}
      <div className="bg-white dark:bg-[#1B2432] rounded-3xl border border-[#E5E1D8] dark:border-gray-800 shadow-soft flex flex-col h-[520px]">
        
        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.sender === 'copilot' && (
                <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-2xl rounded-2xl p-4 text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-[#151923] text-white dark:bg-[#B9825A] dark:text-[#111827] font-medium'
                    : 'bg-[#F8F6F1] dark:bg-gray-900/70 border border-[#E5E1D8] dark:border-gray-800 text-gray-800 dark:text-gray-200'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.text}</div>

                {/* Uncertainty Flag */}
                {msg.isUncertain && (
                  <div className="mt-3 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200 text-[11px] flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>Uncertainty Notice: Available project evidence is incomplete. No speculative assumptions were generated.</span>
                  </div>
                )}

                {/* Evidence Citations */}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#B9825A] block mb-1.5">
                      Grounding Citations ({msg.citations.length}):
                    </span>
                    <div className="space-y-1.5">
                      {msg.citations.map((c, idx) => (
                        <div
                          key={idx}
                          className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-[11px]"
                        >
                          <div className="flex items-center justify-between font-bold text-gray-700 dark:text-gray-300">
                            <span className="truncate">{c.title}</span>
                            <span className="text-[10px] text-[#0F766E] uppercase font-bold shrink-0">{c.status}</span>
                          </div>
                          <div className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                            <FileText className="w-3 h-3 text-[#B9825A]" />
                            <span>{c.document_name}</span>
                            <span>• Page {c.page_number}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-xs text-purple-600 dark:text-purple-400 p-2">
              <Bot className="w-4 h-4 animate-spin" />
              <span>Querying verified project repository and approved citations...</span>
            </div>
          )}
        </div>

        {/* Input Form */}
        <div className="p-4 border-t border-[#E5E1D8] dark:border-gray-800 bg-[#F8F6F1]/50 dark:bg-gray-900/30">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(inputQuery);
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Ask anything about verified project architecture, active tasks, or runbooks..."
              className="flex-1 text-xs p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-[#151923] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
            />
            <button
              type="submit"
              disabled={loading || !inputQuery.trim()}
              className="px-4 py-3 rounded-xl bg-purple-600 text-white font-bold text-xs hover:bg-purple-700 transition disabled:opacity-50 flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>
        </div>

      </div>

    </div>
  );
};
