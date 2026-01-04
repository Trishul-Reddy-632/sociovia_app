// Conversation Thread Component
// =============================
// Right panel showing messages for selected conversation

import { useEffect, useRef, useState, useCallback } from 'react';
import { ConversationMessage } from '../types';
import { MessageBubble } from './MessageBubble';
import { EmptyState } from './EmptyState';
import { MessageComposer } from './MessageComposer';
import { getConversationMessages } from '../api';
import { useWhatsAppPolling } from '../hooks/useWhatsAppPolling';

interface ConversationThreadProps {
  conversationId: number | null;
  userPhone: string;
}

export function ConversationThread({ conversationId, userPhone }: ConversationThreadProps) {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const isInitialLoadRef = useRef(true);

  const checkIfAtBottom = () => {
    if (!messagesContainerRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    // Consider "at bottom" if within 100px of bottom
    return scrollHeight - scrollTop - clientHeight < 100;
  };

  const scrollToBottom = (force = false) => {
    if (!force && !shouldAutoScrollRef.current) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = useCallback(async (isPolling = false) => {
    if (!conversationId) {
      setMessages([]);
      return;
    }

    try {
      setError(null);
      if (!isPolling) {
        setLoading(true);
      }
      
      const fetchedMessages = await getConversationMessages(conversationId, 100);
      
      // Update messages and check for changes
      setMessages(prevMessages => {
        // Only update if messages actually changed (prevent unnecessary re-renders)
        const currentMessageIds = new Set(prevMessages.map(m => m.id));
        const newMessageIds = new Set(fetchedMessages.map(m => m.id));
        const messagesChanged = 
          fetchedMessages.length !== prevMessages.length ||
          fetchedMessages.some(m => !currentMessageIds.has(m.id)) ||
          prevMessages.some(m => !newMessageIds.has(m.id));
        
        if (messagesChanged) {
          // Check if we have new messages at the end (newer messages)
          const lastMessageId = prevMessages.length > 0 ? prevMessages[prevMessages.length - 1].id : null;
          const hasNewMessages = fetchedMessages.length > 0 && 
            (lastMessageId === null || fetchedMessages[fetchedMessages.length - 1].id > lastMessageId);
          
          // Only auto-scroll if at bottom or if it's initial load or if there are new messages
          if (isInitialLoadRef.current || (hasNewMessages && checkIfAtBottom())) {
            setTimeout(() => scrollToBottom(true), 100);
            isInitialLoadRef.current = false;
          }
          
          return fetchedMessages;
        }
        
        return prevMessages; // No change, return previous state
      });
    } catch (err) {
      setError('Failed to load messages');
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  // Handle scroll events to detect if user scrolled up
  const handleScroll = () => {
    shouldAutoScrollRef.current = checkIfAtBottom();
  };

  // Initial load
  useEffect(() => {
    isInitialLoadRef.current = true;
    shouldAutoScrollRef.current = true;
    setMessages([]); // Clear messages when conversation changes
    fetchMessages(false);
  }, [conversationId, fetchMessages]);

  // Poll every 5 seconds when conversation is open
  useWhatsAppPolling({
    enabled: conversationId !== null,
    interval: 5000, // 5 seconds
    onPoll: () => fetchMessages(true), // Pass isPolling flag
  });

  const handleMessageSent = () => {
    // Refresh messages after sending
    setTimeout(fetchMessages, 500);
  };

  if (!conversationId) {
    return (
      <div className="h-full flex items-center justify-center">
        <EmptyState
          title="Select a conversation"
          description="Choose a conversation from the list to view messages"
        />
      </div>
    );
  }

  if (loading && messages.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-muted-foreground">Loading messages...</div>
      </div>
    );
  }

  if (error && messages.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4">
        <p className="text-sm text-destructive mb-4">{error}</p>
        <button
          onClick={fetchMessages}
          className="px-4 py-2 text-sm border rounded hover:bg-accent"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Messages area */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4"
        onScroll={handleScroll}
      >
        {messages.length === 0 ? (
          <EmptyState
            title="No messages"
            description="Start the conversation by sending a message"
          />
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message composer */}
      <MessageComposer
        to={userPhone}
        onMessageSent={handleMessageSent}
      />
    </div>
  );
}

