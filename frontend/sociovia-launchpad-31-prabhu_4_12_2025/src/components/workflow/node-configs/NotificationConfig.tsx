import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface NotificationConfigProps {
  config: Record<string, any>;
  onConfigChange: (key: string, value: any) => void;
  nodeLabel: string;
}

export function NotificationConfig({ config, onConfigChange, nodeLabel }: NotificationConfigProps) {
  // Send Email
  if (nodeLabel.includes("Email")) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Recipients (comma-separated)</Label>
          <Textarea
            value={config.to || "team@example.com"}
            onChange={(e) => onConfigChange("to", e.target.value)}
            placeholder="team@example.com, manager@example.com"
            rows={2}
          />
        </div>
        <div className="space-y-2">
          <Label>Subject Template</Label>
          <Input
            value={config.subject || "Workflow Alert: {{workflow_name}}"}
            onChange={(e) => onConfigChange("subject", e.target.value)}
            placeholder="Use {{variables}} for dynamic content"
          />
        </div>
        <div className="space-y-2">
          <Label>Email Template</Label>
          <Select
            value={config.template || "workflow_summary"}
            onValueChange={(value) => onConfigChange("template", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="workflow_summary">Workflow Summary</SelectItem>
              <SelectItem value="campaign_alert">Campaign Alert</SelectItem>
              <SelectItem value="approval_request">Approval Request</SelectItem>
              <SelectItem value="custom">Custom Template</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {config.template === "custom" && (
          <div className="space-y-2">
            <Label>Custom Body</Label>
            <Textarea
              value={config.body || ""}
              onChange={(e) => onConfigChange("body", e.target.value)}
              placeholder="Email body with {{variables}}"
              rows={4}
            />
          </div>
        )}
      </div>
    );
  }

  // Slack Message
  if (nodeLabel.includes("Slack")) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Channel</Label>
          <Input
            value={config.channel || "#alerts"}
            onChange={(e) => onConfigChange("channel", e.target.value)}
            placeholder="#alerts"
          />
        </div>
        <div className="space-y-2">
          <Label>Message Template</Label>
          <Textarea
            value={config.message || "🚨 Workflow {{workflow_name}} completed\n{{summary}}"}
            onChange={(e) => onConfigChange("message", e.target.value)}
            placeholder="Use {{variables}} for dynamic content"
            rows={4}
          />
          <p className="text-xs text-muted-foreground">
            Available variables: workflow_name, status, campaign_count, summary
          </p>
        </div>
        <div className="space-y-2">
          <Label>Mention Users</Label>
          <Input
            value={config.mention || ""}
            onChange={(e) => onConfigChange("mention", e.target.value)}
            placeholder="@user1, @channel"
          />
        </div>
      </div>
    );
  }

  // Webhook
  if (nodeLabel.includes("Webhook")) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Webhook URL</Label>
          <Input
            value={config.url || "https://"}
            onChange={(e) => onConfigChange("url", e.target.value)}
            placeholder="https://your-webhook-endpoint.com"
          />
        </div>
        <div className="space-y-2">
          <Label>HTTP Method</Label>
          <Select
            value={config.method || "POST"}
            onValueChange={(value) => onConfigChange("method", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="POST">POST</SelectItem>
              <SelectItem value="GET">GET</SelectItem>
              <SelectItem value="PUT">PUT</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Headers (JSON)</Label>
          <Textarea
            value={config.headers || '{"Content-Type": "application/json"}'}
            onChange={(e) => onConfigChange("headers", e.target.value)}
            placeholder='{"Authorization": "Bearer token"}'
            rows={3}
          />
        </div>
        <div className="space-y-2">
          <Label>Payload Template (JSON)</Label>
          <Textarea
            value={config.payload || '{"workflow": "{{workflow_name}}", "status": "{{status}}"}'}
            onChange={(e) => onConfigChange("payload", e.target.value)}
            rows={4}
          />
        </div>
      </div>
    );
  }

  return null;
}
