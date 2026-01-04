// Connect WhatsApp Button Component
// ==================================
// Initiates Meta OAuth flow for WhatsApp Business Account

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, MessageSquare } from 'lucide-react';
import { startWhatsAppConnection } from '../api';
import { toast } from 'sonner';

interface ConnectWhatsAppButtonProps {
  workspaceId: string | null;
  onConnected?: () => void;
}

export function ConnectWhatsAppButton({ workspaceId, onConnected }: ConnectWhatsAppButtonProps) {
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    if (!workspaceId) {
      toast.error('Workspace ID required. Please select a workspace first.');
      return;
    }

    try {
      setConnecting(true);
      const result = await startWhatsAppConnection(workspaceId);

      if (result.success && result.auth_url) {
        // Open Meta OAuth popup
        const width = 600;
        const height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;

        const popup = window.open(
          result.auth_url,
          'WhatsApp Connection',
          `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
        );

        if (!popup) {
          toast.error('Popup blocked. Please allow popups and try again.');
          setConnecting(false);
          return;
        }

        // Poll for popup closure (user completed OAuth)
        const checkClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkClosed);
            setConnecting(false);
            if (onConnected) {
              // Wait a bit for backend to process
              setTimeout(onConnected, 2000);
            }
            toast.success('WhatsApp connection completed!');
          }
        }, 1000);

        // Timeout after 5 minutes
        setTimeout(() => {
          if (!popup.closed) {
            popup.close();
            clearInterval(checkClosed);
            setConnecting(false);
            toast.error('Connection timeout. Please try again.');
          }
        }, 300000);
      } else {
        toast.error(result.error || 'Failed to start connection');
        setConnecting(false);
      }
    } catch (error) {
      console.error('Connection error:', error);
      toast.error('Failed to connect WhatsApp account');
      setConnecting(false);
    }
  };

  return (
    <Button
      onClick={handleConnect}
      disabled={connecting || !workspaceId}
      size="lg"
      className="w-full sm:w-auto"
    >
      {connecting ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Connecting...
        </>
      ) : (
        <>
          <MessageSquare className="w-4 h-4 mr-2" />
          Connect WhatsApp
        </>
      )}
    </Button>
  );
}

