// Conversation Item Component
// ============================
// Single conversation row in the conversations list

import { formatDistanceToNow } from 'date-fns';
import { Conversation } from '../types';
import { cn } from '@/lib/utils';

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
}

export function ConversationItem({ conversation, isActive, onClick }: ConversationItemProps) {
  const lastMessageTime = conversation.last_message_at
    ? formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: true })
    : 'No messages';

  // Extract last message preview from messages if available
  // Note: conversations list doesn't include messages by default, so we show a fallback
  // If messages are included (e.g., from a detailed fetch), use them
  let lastMessagePreview = 'No messages yet';
  
  if (conversation.messages && conversation.messages.length > 0) {
    // Messages are included, get preview from the most recent one
    // Messages are typically sorted oldest first, so get the last one
    const lastMessage = conversation.messages[conversation.messages.length - 1];
    lastMessagePreview = getMessagePreview(lastMessage);
  } else if (conversation.last_message_at) {
    // No message preview available, but we know there are messages
    lastMessagePreview = 'Tap to view messages';
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full p-4 text-left border-b hover:bg-accent transition-colors',
        isActive && 'bg-accent border-l-4 border-l-primary'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold truncate">
              {conversation.user_name || conversation.user_phone}
            </h4>
            {conversation.unread_count > 0 && (
              <span className="flex-shrink-0 px-2 py-0.5 text-xs font-semibold text-white bg-primary rounded-full">
                {conversation.unread_count}
              </span>
            )}
            {conversation.status === 'closed' && (
              <span className="flex-shrink-0 px-2 py-0.5 text-xs text-muted-foreground bg-muted rounded">
                Closed
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground truncate">{lastMessagePreview}</p>
        </div>
        <div className="flex-shrink-0 text-xs text-muted-foreground">{lastMessageTime}</div>
      </div>
    </button>
  );
}

function getMessagePreview(message: any): string {
  if (!message.content) return 'Empty message';
  
  switch (message.type) {
    case 'text':
      return (message.content.text || message.content.body || '').substring(0, 50);
    case 'template':
      return `Template: ${message.content.template_name || 'Unknown'}`;
    case 'image':
      return '📷 Image';
    case 'video':
      return '🎥 Video';
    case 'audio':
      return '🎵 Audio';
    case 'document':
      return '📄 Document';
    case 'interactive':
      return '🔘 Interactive';
    default:
      return 'Message';
  }
}

