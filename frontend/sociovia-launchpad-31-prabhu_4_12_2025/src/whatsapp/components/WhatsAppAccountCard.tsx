// WhatsApp Account Card Component
// =================================
// Displays connected WhatsApp account information

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Phone, Building2, CheckCircle2, XCircle } from 'lucide-react';
import { ConnectionStatusBadge } from './ConnectionStatusBadge';

interface WhatsAppAccount {
  id: number;
  workspace_id: string | null;
  waba_id: string;
  phone_number_id: string;
  display_phone_number: string | null;
  verified_name: string | null;
  quality_score: string | null;
  messaging_limit: number | null;
  token_type: string;
  is_active: boolean;
  created_at: string;
}

interface WhatsAppAccountCardProps {
  account: WhatsAppAccount;
  onUpdate?: () => void;
}

export function WhatsAppAccountCard({ account, onUpdate }: WhatsAppAccountCardProps) {
  const formatPhoneNumber = (phone: string | null) => {
    if (!phone) return 'N/A';
    // Format phone number for display
    return phone.replace(/(\d{2})(\d{3})(\d{3})(\d{4})/, '+$1 $2 $3 $4');
  };

  const formatMessagingLimit = (limit: number | null) => {
    if (!limit) return 'Unknown';
    if (limit >= 1000000) return 'Unlimited';
    if (limit >= 1000) return `${limit / 1000}K`;
    return limit.toString();
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Phone className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">
                {account.verified_name || 'WhatsApp Business Account'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {formatPhoneNumber(account.display_phone_number)}
              </p>
            </div>
          </div>
          <ConnectionStatusBadge
            isActive={account.is_active}
            tokenType={account.token_type}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="flex items-center gap-2 text-sm">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">WABA ID:</span>
            <span className="font-mono text-xs">{account.waba_id}</span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Phone className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Phone Number ID:</span>
            <span className="font-mono text-xs">{account.phone_number_id}</span>
          </div>

          {account.quality_score && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Quality Score:</span>
              <Badge
                variant={
                  account.quality_score === 'GREEN'
                    ? 'default'
                    : account.quality_score === 'YELLOW'
                    ? 'secondary'
                    : 'destructive'
                }
              >
                {account.quality_score}
              </Badge>
            </div>
          )}

          {account.messaging_limit && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Messaging Limit:</span>
              <span className="font-semibold">{formatMessagingLimit(account.messaging_limit)}</span>
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
          Connected {new Date(account.created_at).toLocaleDateString()}
          {account.token_type === 'permanent' && (
            <span className="ml-2">• Permanent token</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

