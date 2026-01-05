// Message Bubble Component
// =======================
// Individual message display (incoming/outgoing)

import { format } from 'date-fns';
import { Check, CheckCheck, AlertCircle } from 'lucide-react';
import { ConversationMessage } from '../types';
import { cn } from '@/lib/utils';

interface MessageBubbleProps {
  message: ConversationMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isOutgoing = message.direction === 'outgoing';
  const isFailed = message.status === 'failed';

  return (
    <div
      className={cn(
        'flex w-full mb-4',
        isOutgoing ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'max-w-[70%] rounded-lg px-4 py-2',
          isOutgoing
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-foreground',
          isFailed && 'border border-destructive'
        )}
      >
        {/* Message content */}
        <div className="mb-1">
          {renderMessageContent(message)}
        </div>

        {/* Timestamp and status */}
        <div className="flex items-center gap-1 text-xs opacity-70">
          <span>
            {message.created_at
              ? (() => {
                try {
                  return format(new Date(message.created_at), 'HH:mm');
                } catch {
                  return new Date(message.created_at).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                  });
                }
              })()
              : '--:--'}
          </span>
          {isOutgoing && (
            <span className="ml-1">
              {renderStatusIcon(message.status, isFailed)}
            </span>
          )}
        </div>

        {/* Error message */}
        {isFailed && message.error_message && (
          <div className="mt-2 text-xs opacity-90 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            <span>{message.error_message}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function renderMessageContent(message: ConversationMessage) {
  const { type, content } = message;

  // Handle missing or invalid content
  if (!content || typeof content !== 'object') {
    return <p className="text-xs opacity-70">Message content unavailable</p>;
  }

  switch (type) {
    case 'text': {
      const textContent = content?.text || content?.body || '';
      return (
        <p className="whitespace-pre-wrap break-words">
          {textContent || 'Empty message'}
        </p>
      );
    }

    case 'template':
      return (
        <div>
          <p className="text-xs opacity-70 mb-1">
            Template: {content?.template_name || content?.name || 'Unknown'}
          </p>
          {content?.body && <p className="break-words">{content.body}</p>}
          {content?.text && <p className="break-words">{content.text}</p>}
          {content?.error_message && (
            <p className="text-xs mt-1 text-destructive">
              Error: {content.error_message}
            </p>
          )}
        </div>
      );

    case 'image':
      return (
        <div>
          <div className="bg-black/20 rounded p-4 text-center mb-2">📷 Image</div>
          {content?.caption && <p className="break-words">{content.caption}</p>}
          {content?.text && <p className="break-words">{content.text}</p>}
          {content?.image_url && (
            <a
              href={content.image_url as string}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs underline"
            >
              View image
            </a>
          )}
        </div>
      );

    case 'video':
      return (
        <div>
          <div className="bg-black/20 rounded p-4 text-center mb-2">🎥 Video</div>
          {content?.caption && <p>{content.caption}</p>}
        </div>
      );

    case 'audio':
      return <div className="bg-black/20 rounded p-4 text-center">🎵 Audio</div>;

    case 'document':
      return (
        <div>
          <div className="bg-black/20 rounded p-4 text-center mb-2">📄 Document</div>
          {content?.filename && <p className="text-xs">{content.filename}</p>}
          {content?.caption && <p>{content.caption}</p>}
        </div>
      );

    case 'interactive':
      return (
        <div>
          <p className="text-xs opacity-70 mb-1">🔘 Interactive Message</p>
          {content?.body && <p className="break-words">{content.body}</p>}
          {content?.text && <p className="break-words">{content.text}</p>}
          {content?.header && <p className="text-xs mt-1 font-semibold break-words">{content.header}</p>}
          {content?.footer && <p className="text-xs mt-1 opacity-70 break-words">{content.footer}</p>}
        </div>
      );

    default:
      return <p className="text-xs opacity-70">Unsupported message type: {type}</p>;
  }
}

function renderStatusIcon(status: string, isFailed: boolean) {
  if (isFailed) {
    return <AlertCircle className="w-3 h-3" />;
  }

  switch (status) {
    case 'sent':
      return <Check className="w-3 h-3" />;
    case 'delivered':
      return <CheckCheck className="w-3 h-3" />;
    case 'read':
      return <CheckCheck className="w-3 h-3 text-blue-300" />;
    default:
      return null;
  }
}

