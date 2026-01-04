import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ApprovalConfigProps {
  config: Record<string, any>;
  onConfigChange: (key: string, value: any) => void;
}

export function ApprovalConfig({ config, onConfigChange }: ApprovalConfigProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Approvers (comma-separated)</Label>
        <Textarea
          value={Array.isArray(config.approvers) ? config.approvers.join(", ") : config.approvers || "finance"}
          onChange={(e) => onConfigChange("approvers", e.target.value.split(",").map(a => a.trim()))}
          placeholder="finance, manager, admin"
          rows={2}
        />
        <p className="text-xs text-muted-foreground">
          Roles or user IDs who can approve this action
        </p>
      </div>
      <div className="space-y-2">
        <Label>Time to Live (TTL)</Label>
        <Select
          value={config.ttl || "24h"}
          onValueChange={(value) => onConfigChange("ttl", value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1h">1 hour</SelectItem>
            <SelectItem value="4h">4 hours</SelectItem>
            <SelectItem value="12h">12 hours</SelectItem>
            <SelectItem value="24h">24 hours</SelectItem>
            <SelectItem value="48h">48 hours</SelectItem>
            <SelectItem value="7d">7 days</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          How long before approval request expires
        </p>
      </div>
      <div className="space-y-2">
        <Label>Escalation Policy</Label>
        <Select
          value={config.escalation || "admin"}
          onValueChange={(value) => onConfigChange("escalation", value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Escalate to Admin</SelectItem>
            <SelectItem value="cancel">Cancel Action</SelectItem>
            <SelectItem value="auto_approve">Auto-approve</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          What to do if TTL expires
        </p>
      </div>
      <div className="space-y-2">
        <Label>Required Approvals</Label>
        <Input
          type="number"
          min={1}
          value={config.required_approvals || 1}
          onChange={(e) => onConfigChange("required_approvals", parseInt(e.target.value))}
        />
        <p className="text-xs text-muted-foreground">
          Number of approvals needed to proceed
        </p>
      </div>
    </div>
  );
}
