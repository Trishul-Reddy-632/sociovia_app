import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface SelectorConfigProps {
  config: Record<string, any>;
  onConfigChange: (key: string, value: any) => void;
  nodeLabel: string;
}

export function SelectorConfig({ config, onConfigChange, nodeLabel }: SelectorConfigProps) {
  // Query Campaigns
  if (nodeLabel.includes("Query")) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Filter Metric</Label>
          <Select
            value={config.metric || "spend"}
            onValueChange={(value) => onConfigChange("metric", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="spend">Spend</SelectItem>
              <SelectItem value="roas">ROAS</SelectItem>
              <SelectItem value="ctr">CTR</SelectItem>
              <SelectItem value="conversions">Conversions</SelectItem>
              <SelectItem value="impressions">Impressions</SelectItem>
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
              <SelectItem value=">">Greater than</SelectItem>
              <SelectItem value="<">Less than</SelectItem>
              <SelectItem value=">=">Greater or equal</SelectItem>
              <SelectItem value="<=">Less or equal</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Value</Label>
          <Input
            type="number"
            step="0.01"
            value={config.value || 1000}
            onChange={(e) => onConfigChange("value", parseFloat(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          <Label>Time Window (days)</Label>
          <Input
            type="number"
            value={config.time_window_days || 7}
            onChange={(e) => onConfigChange("time_window_days", parseInt(e.target.value))}
          />
          <p className="text-xs text-muted-foreground">Look back period for metrics</p>
        </div>
        <div className="space-y-2">
          <Label>Campaign Status</Label>
          <Select
            value={config.status || "active"}
            onValueChange={(value) => onConfigChange("status", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active Only</SelectItem>
              <SelectItem value="paused">Paused Only</SelectItem>
              <SelectItem value="all">All Statuses</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  }

  // Top Performers
  if (nodeLabel.includes("Top") || nodeLabel.includes("Performer")) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Rank By Metric</Label>
          <Select
            value={config.metric || "roas"}
            onValueChange={(value) => onConfigChange("metric", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="roas">ROAS</SelectItem>
              <SelectItem value="conversions">Conversions</SelectItem>
              <SelectItem value="ctr">CTR</SelectItem>
              <SelectItem value="revenue">Revenue</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Number of Top Results</Label>
          <Input
            type="number"
            value={config.limit || 5}
            onChange={(e) => onConfigChange("limit", parseInt(e.target.value))}
            min={1}
            max={50}
          />
        </div>
        <div className="space-y-2">
          <Label>Minimum ROAS</Label>
          <Input
            type="number"
            step="0.1"
            value={config.min_roas || 2.5}
            onChange={(e) => onConfigChange("min_roas", parseFloat(e.target.value))}
          />
          <p className="text-xs text-muted-foreground">Only include campaigns above this ROAS</p>
        </div>
        <div className="space-y-2">
          <Label>Minimum Spend ($)</Label>
          <Input
            type="number"
            value={config.min_spend || 500}
            onChange={(e) => onConfigChange("min_spend", parseFloat(e.target.value))}
          />
          <p className="text-xs text-muted-foreground">Filter out low-spend campaigns</p>
        </div>
      </div>
    );
  }

  // By Tags
  if (nodeLabel.includes("Tag")) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Tags (comma-separated)</Label>
          <Textarea
            value={Array.isArray(config.tags) ? config.tags.join(", ") : config.tags || ""}
            onChange={(e) => onConfigChange("tags", e.target.value.split(",").map(t => t.trim()))}
            placeholder="winners, high-roas, seasonal"
            rows={3}
          />
          <p className="text-xs text-muted-foreground">
            Select campaigns with any of these tags
          </p>
        </div>
        <div className="space-y-2">
          <Label>Match Type</Label>
          <Select
            value={config.match_type || "any"}
            onValueChange={(value) => onConfigChange("match_type", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any tag (OR)</SelectItem>
              <SelectItem value="all">All tags (AND)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  }

  return null;
}
