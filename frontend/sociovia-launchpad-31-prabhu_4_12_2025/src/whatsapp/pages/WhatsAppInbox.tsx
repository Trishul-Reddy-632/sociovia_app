// WhatsApp Inbox Page
// ====================
// Main inbox UI for viewing conversations and messages

import { useState } from 'react';
import { ConversationList, ConversationThread } from '../components';
import { Conversation } from '../types';

export function WhatsAppInbox() {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="border-b bg-background p-4">
        <h1 className="text-2xl font-bold">WhatsApp Inbox</h1>
        <p className="text-sm text-muted-foreground">
          View conversations and messages. Messages update every 5 seconds.
        </p>
      </div>

      {/* Main content - split screen */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel - Conversations list */}
        <div className="w-1/3 border-r bg-background overflow-hidden">
          <ConversationList
            selectedConversationId={selectedConversation?.id || null}
            onSelectConversation={handleSelectConversation}
          />
        </div>

        {/* Right panel - Message thread */}
        <div className="flex-1 bg-background overflow-hidden">
          <ConversationThread
            conversationId={selectedConversation?.id || null}
            userPhone={selectedConversation?.user_phone || ''}
          />
        </div>
      </div>
    </div>
  );
}

