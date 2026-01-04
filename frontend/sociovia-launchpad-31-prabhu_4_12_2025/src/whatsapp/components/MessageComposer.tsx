// Message Composer Component
// ==========================
// Simple text input for sending messages (Phase-1: text only)

import { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { sendTextMessageFromInbox } from '../api';
import { toast } from 'sonner';

interface MessageComposerProps {
  to: string;
  onMessageSent: () => void;
}

export function MessageComposer({ to, onMessageSent }: MessageComposerProps) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    const text = message.trim();
    if (!text || sending) return;

    setSending(true);
    try {
      const result = await sendTextMessageFromInbox(to, text, false);
      
      if (result.success) {
        setMessage('');
        onMessageSent();
        toast.success('Message sent');
      } else {
        toast.error(result.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t p-4 bg-background">
      <div className="flex gap-2">
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message... (Press Enter to send)"
          rows={2}
          disabled={sending}
          className="resize-none"
        />
        <Button
          onClick={handleSend}
          disabled={!message.trim() || sending}
          size="icon"
          className="self-end"
        >
          {sending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Phase-1: Text messages only. Templates available in Test Console.
      </p>
    </div>
  );
}

