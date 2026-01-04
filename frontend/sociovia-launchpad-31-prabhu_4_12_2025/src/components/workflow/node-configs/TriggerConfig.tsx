import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TriggerConfigProps {
  config: Record<string, any>;
  onConfigChange: (key: string, value: any) => void;
  nodeLabel: string;
}

export function TriggerConfig({ config, onConfigChange, nodeLabel }: TriggerConfigProps) {
  // Cron Schedule
  if (nodeLabel.includes("Cron") || nodeLabel.includes("Daily") || nodeLabel.includes("Schedule")) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Schedule (Cron Expression)</Label>
          <Input
            value={config.schedule || "0 2 * * *"}
            onChange={(e) => onConfigChange("schedule", e.target.value)}
            placeholder="0 2 * * *"
          />
          <p className="text-xs text-muted-foreground">
            Examples: "0 2 * * *" (daily at 2 AM), "0 */6 * * *" (every 6 hours)
          </p>
        </div>
        <div className="space-y-2">
          <Label>Timezone</Label>
          <Select
            value={config.timezone || "UTC"}
            onValueChange={(value) => onConfigChange("timezone", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="UTC">UTC</SelectItem>
              <SelectItem value="America/New_York">EST</SelectItem>
              <SelectItem value="America/Los_Angeles">PST</SelectItem>
              <SelectItem value="Europe/London">GMT</SelectItem>
              <SelectItem value="Asia/Kolkata">IST</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  }

  // Metric Threshold Trigger
  if (nodeLabel.includes("Metric") || nodeLabel.includes("Threshold")) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Metric</Label>
          <Select
            value={config.metric || "roas"}
            onValueChange={(value) => onConfigChange("metric", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="roas">ROAS</SelectItem>
              <SelectItem value="ctr">CTR</SelectItem>
              <SelectItem value="cpc">CPC</SelectItem>
              <SelectItem value="spend">Spend</SelectItem>
              <SelectItem value="conversions">Conversions</SelectItem>
              <SelectItem value="cpa">CPA</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Operator</Label>
          <Select
            value={config.operator || ">"}
            onValueChange={(value) => onConfigChange("operator", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value=">">Greater than ({">"}) </SelectItem>
              <SelectItem value="<">Less than ({"<"})</SelectItem>
              <SelectItem value=">=">Greater or equal ({">="})</SelectItem>
              <SelectItem value="<=">Less or equal ({"<="})</SelectItem>
              <SelectItem value="==">Equal (==)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Threshold Value</Label>
          <Input
            type="number"
            step="0.01"
            value={config.value || 2.5}
            onChange={(e) => onConfigChange("value", parseFloat(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          <Label>Check Interval (minutes)</Label>
          <Input
            type="number"
            value={config.check_interval || 30}
            onChange={(e) => onConfigChange("check_interval", parseInt(e.target.value))}
          />
        </div>
      </div>
    );
  }

  // Webhook Trigger
  if (nodeLabel.includes("Webhook")) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Webhook URL</Label>
          <Input
            value={config.url || "/webhook/workflow-trigger"}
            onChange={(e) => onConfigChange("url", e.target.value)}
            placeholder="/webhook/workflow-trigger"
          />
          <p className="text-xs text-muted-foreground">
            External services can trigger this workflow by calling this webhook
          </p>
        </div>
        <div className="space-y-2">
          <Label>Authentication</Label>
          <Select
            value={config.auth_type || "bearer"}
            onValueChange={(value) => onConfigChange("auth_type", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="bearer">Bearer Token</SelectItem>
              <SelectItem value="api_key">API Key</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  }

  // Manual Trigger
  return (
    <div className="space-y-4">
      <div className="p-4 border rounded-lg bg-muted/50">
        <p className="text-sm text-muted-foreground">
          This workflow can be triggered manually from the dashboard or via API call.
        </p>
      </div>
    </div>
  );
}
