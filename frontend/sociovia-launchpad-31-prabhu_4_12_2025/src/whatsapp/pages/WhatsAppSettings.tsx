// WhatsApp Settings Page
// ======================
// Phase-2 Part-1: Connect and manage WhatsApp Business Accounts

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConnectWhatsAppButton } from '../components/ConnectWhatsAppButton';
import { WhatsAppAccountCard } from '../components/WhatsAppAccountCard';
import { getWhatsAppAccounts } from '../api';

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

export function WhatsAppSettings() {
  const [searchParams] = useSearchParams();
  const [accounts, setAccounts] = useState<WhatsAppAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  // Get workspace ID from URL params, sessionStorage, or localStorage
  useEffect(() => {
    // Try multiple sources for workspace ID (matching app patterns)
    const wsId = 
      searchParams.get('workspace_id') || 
      sessionStorage.getItem('sv_selected_workspace_id') ||
      localStorage.getItem('sv_selected_workspace_id') ||
      null;
    
    if (wsId) {
      setWorkspaceId(wsId);
      setError(null);
    } else {
      // Show helpful message if no workspace found
      setError('No workspace selected. Please select a workspace first.');
    }
  }, [searchParams]);

  const fetchAccounts = async () => {
    try {
      setError(null);
      setLoading(true);
      const result = await getWhatsAppAccounts(workspaceId || undefined);
      setAccounts(result.accounts || []);
    } catch (err) {
      setError('Failed to load WhatsApp accounts');
      console.error('Error fetching accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (workspaceId) {
      fetchAccounts();
    }
    
    // Check if we just connected (from OAuth callback)
    if (searchParams.get('connected') === 'true') {
      // Refresh accounts after connection
      setTimeout(() => {
        if (workspaceId) {
          fetchAccounts();
        }
      }, 1000);
      // Remove query param
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('connected');
      window.history.replaceState({}, '', `${window.location.pathname}?${newParams.toString()}`);
    }
  }, [workspaceId, searchParams]);

  const handleConnected = () => {
    // Refresh accounts after connection
    fetchAccounts();
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">WhatsApp Settings</h1>
        <p className="text-muted-foreground">
          Connect your WhatsApp Business Account to start sending messages
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-destructive/10 text-destructive rounded-lg">
          {error}
          {!workspaceId && (
            <p className="text-sm mt-2">
              You can select a workspace from the dashboard or add <code className="text-xs bg-muted px-1 py-0.5 rounded">?workspace_id=YOUR_ID</code> to the URL.
            </p>
          )}
        </div>
      )}

      {/* Connect Button */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Connect WhatsApp Business Account</CardTitle>
          <CardDescription>
            Connect your Meta WhatsApp Business Account using Embedded Signup.
            This will allow you to send messages without manual token entry.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!workspaceId ? (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">
                Please select a workspace to connect WhatsApp.
              </p>
              <p className="text-xs text-muted-foreground">
                You can select a workspace from the dashboard or navigate here with <code className="bg-background px-1 py-0.5 rounded">?workspace_id=YOUR_ID</code>
              </p>
            </div>
          ) : (
            <ConnectWhatsAppButton
              workspaceId={workspaceId}
              onConnected={handleConnected}
            />
          )}
        </CardContent>
      </Card>

      {/* Connected Accounts */}
      <Card>
        <CardHeader>
          <CardTitle>Connected Accounts</CardTitle>
          <CardDescription>
            {accounts.length === 0
              ? 'No WhatsApp accounts connected yet'
              : `${accounts.length} account${accounts.length > 1 ? 's' : ''} connected`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading accounts...
            </div>
          ) : accounts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No accounts connected.</p>
              <p className="text-sm mt-2">Click "Connect WhatsApp" above to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {accounts.map((account) => (
                <WhatsAppAccountCard
                  key={account.id}
                  account={account}
                  onUpdate={fetchAccounts}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

