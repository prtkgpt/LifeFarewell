"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { SendHorizontal, MessageSquare, Loader2 } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

interface Message {
  id: string;
  role: string;
  content: string;
  createdAt: string;
}

export default function IntakePage() {
  const { caseId } = useParams<{ caseId: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    async function loadMessages() {
      try {
        const res = await fetch(`/api/cases/${caseId}/intake`);
        if (res.ok) {
          const data = await res.json();
          setMessages(data);
        }
      } catch (err) {
        console.error("Failed to load messages:", err);
      } finally {
        setInitialLoading(false);
      }
    }
    loadMessages();
  }, [caseId]);

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`/api/cases/${caseId}/intake`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  if (initialLoading) {
    return (
      <div className="flex h-[calc(100vh-12rem)] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-stone-400" />
          <p className="mt-3 text-sm text-stone-500">Loading conversation...</p>
        </div>
      </div>
    );
  }

  const hasMessages = messages.length > 0;

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3 border-b border-stone-200 pb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-900">
          <MessageSquare className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-stone-900">Intake Chat</h1>
          <p className="text-sm text-stone-500">
            Tell us about your needs and preferences
          </p>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto rounded-xl bg-stone-50 p-4">
        {!hasMessages && (
          <div className="flex h-full items-center justify-center">
            <div className="max-w-md text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50">
                <MessageSquare className="h-7 w-7 text-amber-600" />
              </div>
              <h2 className="text-lg font-semibold text-stone-900">
                Welcome to your intake session
              </h2>
              <p className="mt-2 text-sm text-stone-500">
                I&apos;m here to help gather details about your needs. What type
                of service are you looking for?
              </p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {messages.map((msg) => {
            const isUser = msg.role === "user";
            return (
              <div
                key={msg.id}
                className={`flex ${isUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                    isUser
                      ? "rounded-br-md bg-stone-900 text-white"
                      : "rounded-bl-md bg-white text-stone-800 shadow-sm border border-stone-200"
                  }`}
                >
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {msg.content}
                  </p>
                  <p
                    className={`mt-1.5 text-[11px] ${
                      isUser ? "text-stone-400" : "text-stone-400"
                    }`}
                  >
                    {formatDateTime(msg.createdAt)}
                  </p>
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-md border border-stone-200 bg-white px-4 py-3 shadow-sm">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-stone-400 [animation-delay:-0.3s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-stone-400 [animation-delay:-0.15s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-stone-400" />
                </div>
              </div>
            </div>
          )}
        </div>

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="mt-4 flex items-center gap-3">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
          disabled={loading}
          className="flex-1 rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500 disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || loading}
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-stone-900 text-white transition-colors hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <SendHorizontal className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
