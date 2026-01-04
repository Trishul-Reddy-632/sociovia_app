import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface ActionConfigProps {
  config: Record<string, any>;
  onConfigChange: (key: string, value: any) => void;
  nodeLabel: string;
}

export function ActionConfig({ config, onConfigChange, nodeLabel }: ActionConfigProps) {
  // Pause Campaign
  if (nodeLabel.includes("Pause")) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Pause Level</Label>
          <Select
            value={config.level || "campaign"}
            onValueChange={(value) => onConfigChange("level", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="campaign">Entire Campaign</SelectItem>
              <SelectItem value="adset">AdSets Only</SelectItem>
              <SelectItem value="ad">Ads Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Notification</Label>
          <Select
            value={config.notify || "always"}
            onValueChange={(value) => onConfigChange("notify", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="always">Always Notify</SelectItem>
              <SelectItem value="never">Never Notify</SelectItem>
              <SelectItem value="on_error">Only on Error</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  }

  // Resume Campaign
  if (nodeLabel.includes("Resume")) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Resume Level</Label>
          <Select
            value={config.level || "campaign"}
            onValueChange={(value) => onConfigChange("level", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="campaign">Entire Campaign</SelectItem>
              <SelectItem value="adset">AdSets Only</SelectItem>
              <SelectItem value="ad">Ads Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  }

  // Adjust Budget
  if (nodeLabel.includes("Adjust") || nodeLabel.includes("Budget")) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Adjustment Type</Label>
          <Select
            value={config.adjustment_type || "percentage"}
            onValueChange={(value) => onConfigChange("adjustment_type", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="percentage">Percentage Change</SelectItem>
              <SelectItem value="absolute">Absolute Amount</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Change Amount (%)</Label>
          <Input
            type="number"
            step="1"
            value={config.change_pct || 25}
            onChange={(e) => onConfigChange("change_pct", parseInt(e.target.value))}
          />
          <p className="text-xs text-muted-foreground">
            Positive to increase, negative to decrease
          </p>
        </div>
        <div className="space-y-2">
          <Label>Maximum Budget ($)</Label>
          <Input
            type="number"
            value={config.max_budget || 10000}
            onChange={(e) => onConfigChange("max_budget", parseFloat(e.target.value))}
          />
          <p className="text-xs text-muted-foreground">
            Safety cap - budget won't exceed this
          </p>
        </div>
        <div className="space-y-2">
          <Label>Minimum Budget ($)</Label>
          <Input
            type="number"
            value={config.min_budget || 100}
            onChange={(e) => onConfigChange("min_budget", parseFloat(e.target.value))}
          />
        </div>
      </div>
    );
  }

  // Duplicate AdSet
  if (nodeLabel.includes("Duplicate")) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Budget Multiplier</Label>
          <Input
            type="number"
            step="0.1"
            value={config.budget_multiplier || 1.5}
            onChange={(e) => onConfigChange("budget_multiplier", parseFloat(e.target.value))}
          />
          <p className="text-xs text-muted-foreground">
            New adset budget = original × multiplier
          </p>
        </div>
        <div className="space-y-2">
          <Label>Number of Copies</Label>
          <Input
            type="number"
            min={1}
            max={5}
            value={config.num_copies || 1}
            onChange={(e) => onConfigChange("num_copies", parseInt(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          <Label>Name Suffix</Label>
          <Input
            value={config.name_suffix || " - Copy"}
            onChange={(e) => onConfigChange("name_suffix", e.target.value)}
            placeholder=" - Copy"
          />
        </div>
      </div>
    );
  }

  // Swap Creative
  if (nodeLabel.includes("Swap") || nodeLabel.includes("Creative")) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Creative Selection</Label>
          <Select
            value={config.selection_method || "top_performer"}
            onValueChange={(value) => onConfigChange("selection_method", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="top_performer">Use Top Performer</SelectItem>
              <SelectItem value="ai_generated">AI Generated</SelectItem>
              <SelectItem value="specific">Specific Creative ID</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {config.selection_method === "specific" && (
          <div className="space-y-2">
            <Label>Creative ID</Label>
            <Input
              value={config.creative_id || ""}
              onChange={(e) => onConfigChange("creative_id", e.target.value)}
              placeholder="Enter creative ID"
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-lg bg-muted/50">
      <p className="text-sm text-muted-foreground">
        This action will be applied to selected campaigns/adsets from previous nodes.
      </p>
    </div>
  );
}
