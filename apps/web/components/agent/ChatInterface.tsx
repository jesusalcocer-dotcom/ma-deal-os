'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  agent_type?: string;
  timestamp: string;
  tokens_used?: number;
  cost_usd?: number;
}

interface ChatInterfaceProps {
  dealId: string;
}

export function ChatInterface({ dealId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [agentType, setAgentType] = useState<'manager' | 'system_expert'>('manager');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const conversationHistory = messages.map((m) => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
        agent_type: m.agent_type,
      }));

      const res = await fetch(`/api/deals/${dealId}/agent/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          agent_type: agentType,
          conversation_history: conversationHistory,
        }),
      });

      const data = await res.json();

      if (data.error) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `Error: ${data.error}`,
            agent_type: agentType,
            timestamp: new Date().toISOString(),
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: data.response,
            agent_type: data.agent_type,
            timestamp: new Date().toISOString(),
            tokens_used: data.tokens_used,
            cost_usd: data.cost_usd,
          },
        ]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Network error: ${err.message}`,
          agent_type: agentType,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const totalTokens = messages.reduce((sum, m) => sum + (m.tokens_used || 0), 0);
  const totalCost = messages.reduce((sum, m) => sum + (m.cost_usd || 0), 0);

  return (
    <div className="flex flex-col h-[calc(100vh-16rem)]">
      {/* Agent type selector */}
      <div className="flex items-center gap-4 pb-4 border-b">
        <span className="text-sm font-medium text-muted-foreground">Agent:</span>
        <div className="flex gap-2">
          <button
            onClick={() => setAgentType('manager')}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              agentType === 'manager'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Manager
          </button>
          <button
            onClick={() => setAgentType('system_expert')}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              agentType === 'system_expert'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            System Expert
          </button>
        </div>
        {totalTokens > 0 && (
          <span className="ml-auto text-xs text-muted-foreground">
            {totalTokens.toLocaleString()} tokens | ${totalCost.toFixed(4)}
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-12">
            <p className="text-lg font-medium">
              {agentType === 'manager'
                ? 'Manager Agent'
                : 'System Expert'}
            </p>
            <p className="text-sm mt-1">
              {agentType === 'manager'
                ? 'Ask about deal status, priorities, risks, and strategy.'
                : 'Ask about platform features, data model, and configuration.'}
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              }`}
            >
              {msg.role === 'assistant' && msg.agent_type && (
                <div className="text-xs font-medium text-muted-foreground mb-1">
                  {msg.agent_type === 'manager' ? 'Manager' : 'System Expert'}
                </div>
              )}
              <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
              {msg.tokens_used && (
                <div className="text-xs text-muted-foreground mt-2">
                  {msg.tokens_used.toLocaleString()} tokens
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="animate-pulse">Thinking...</div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t pt-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              agentType === 'manager'
                ? 'Ask the Manager Agent...'
                : 'Ask the System Expert...'
            }
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
