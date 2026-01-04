// Conversation List Component
// ===========================
// Left panel showing all conversations

import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConversationItem } from './ConversationItem';
import { EmptyState } from './EmptyState';
import { getConversations } from '../api';
import { Conversation } from '../types';
import { useWhatsAppPolling } from '../hooks/useWhatsAppPolling';

interface ConversationListProps {
  selectedConversationId: number | null;
  onSelectConversation: (conversation: Conversation) => void;
}

export function ConversationList({
  selectedConversationId,
  onSelectConversation,
}: ConversationListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = async () => {
    try {
      setError(null);
      const result = await getConversations(50, 0);
      setConversations(result.conversations);
    } catch (err) {
      setError('Failed to load conversations');
      console.error('Error fetching conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchConversations();
  }, []);

  // Poll every 10 seconds
  useWhatsAppPolling({
    enabled: true,
    interval: 10000, // 10 seconds
    onPoll: fetchConversations,
  });

  if (loading && conversations.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <p className="text-sm text-destructive mb-4">{error}</p>
        <Button onClick={fetchConversations} variant="outline" size="sm">
          Retry
        </Button>
      </div>
    );
  }

  if (conversations.length === 0) {
    return <EmptyState title="No conversations" description="Start a conversation to see it here" />;
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="font-semibold">Conversations</h2>
        <Button
          onClick={fetchConversations}
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {conversations.map((conv) => (
          <ConversationItem
            key={conv.id}
            conversation={conv}
            isActive={conv.id === selectedConversationId}
            onClick={() => onSelectConversation(conv)}
          />
        ))}
      </div>
    </div>
  );
}

