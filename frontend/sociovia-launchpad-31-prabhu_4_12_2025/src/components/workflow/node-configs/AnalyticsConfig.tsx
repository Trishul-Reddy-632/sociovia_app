// src/components/workflow/node-configs/AnalyticsConfig.tsx
import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

interface AnalyticsConfigProps {
  config: Record<string, any>;
  onConfigChange: (key: string, value: any) => void;
  nodeLabel: string;
}

export function AnalyticsConfig({ config, onConfigChange, nodeLabel }: AnalyticsConfigProps) {
  // Common analytics configs
  const periodOptions = [
    { value: "daily", label: "Daily" },
    { value: "weekly", label: "Weekly" },
    { value: "monthly", label: "Monthly" },
    { value: "custom", label: "Custom" },
  ];

  const formatOptions = [
    { value: "pdf", label: "PDF" },
    { value: "csv", label: "CSV" },
    { value: "excel", label: "Excel" },
    { value: "json", label: "JSON" },
    { value: "html", label: "HTML Dashboard" },
  ];

  // Specific to nodeLabel
  if (nodeLabel.includes("Generate Report")) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Report Period</Label>
          <Select
            value={config.period || "weekly"}
            onValueChange={(value) => onConfigChange("period", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {periodOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Output Format</Label>
          <Select
            value={config.format || "pdf"}
            onValueChange={(value) => onConfigChange("format", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {formatOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Metrics to Include (comma-separated)</Label>
          <Input
            value={config.fields || "roas,spend,conversions,ctr"}
            onChange={(e) => onConfigChange("fields", e.target.value)}
            placeholder="roas,spend,conversions"
          />
          <p className="text-xs text-muted-foreground">
            e.g., roas, spend, conversions, ctr, cpc
          </p>
        </div>
        <div className="space-y-2">
          <Label>Custom Filters</Label>
          <Textarea
            value={config.filters || ""}
            onChange={(e) => onConfigChange("filters", e.target.value)}
            placeholder='{"status": "active", "objective": "conversions"}'
            rows={3}
          />
          <p className="text-xs text-muted-foreground">JSON filters for insights query</p>
        </div>
        <div className="space-y-2">
          <Label>Recipients (emails)</Label>
          <Input
            value={config.recipients || "team@example.com"}
            onChange={(e) => onConfigChange("recipients", e.target.value)}
            placeholder="team@example.com, manager@company.com"
          />
        </div>
      </div>
    );
  }

  if (nodeLabel.includes("Export Data")) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Export Format</Label>
          <Select
            value={config.format || "csv"}
            onValueChange={(value) => onConfigChange("format", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {formatOptions.filter(opt => opt.value !== "pdf" && opt.value !== "html").map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Data Level</Label>
          <Select
            value={config.level || "campaign"}
            onValueChange={(value) => onConfigChange("level", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="account">Account</SelectItem>
              <SelectItem value="campaign">Campaign</SelectItem>
              <SelectItem value="adset">AdSet</SelectItem>
              <SelectItem value="ad">Ad</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Fields to Export</Label>
          <Input
            value={config.fields || "name,id,status,spend,impressions"}
            onChange={(e) => onConfigChange("fields", e.target.value)}
            placeholder="name,id,status,spend,impressions"
          />
          <p className="text-xs text-muted-foreground">
            Comma-separated Graph API fields
          </p>
        </div>
        <div className="space-y-2">
          <Label>Time Range</Label>
          <div className="flex gap-2">
            <Input
              type="date"
              value={config.since || ""}
              onChange={(e) => onConfigChange("since", e.target.value)}
              placeholder="Start date"
              className="flex-1"
            />
            <Input
              type="date"
              value={config.until || ""}
              onChange={(e) => onConfigChange("until", e.target.value)}
              placeholder="End date"
              className="flex-1"
            />
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="include-insights"
            checked={config.include_insights || false}
            onCheckedChange={(checked) => onConfigChange("include_insights", checked)}
          />
          <Label htmlFor="include-insights" className="text-sm">Include Insights Data</Label>
        </div>
      </div>
    );
  }

  if (nodeLabel.includes("Dashboard Update")) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Dashboard ID</Label>
          <Input
            value={config.dashboard_id || ""}
            onChange={(e) => onConfigChange("dashboard_id", e.target.value)}
            placeholder="e.g., main-dashboard"
          />
          <p className="text-xs text-muted-foreground">ID of the dashboard to update</p>
        </div>
        <div className="space-y-2">
          <Label>Update Frequency</Label>
          <Select
            value={config.frequency || "hourly"}
            onValueChange={(value) => onConfigChange("frequency", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="real_time">Real-time</SelectItem>
              <SelectItem value="hourly">Hourly</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Widgets to Update (comma-separated)</Label>
          <Input
            value={config.widgets || "roas-chart,spend-gauge"}
            onChange={(e) => onConfigChange("widgets", e.target.value)}
            placeholder="roas-chart,spend-gauge,conversions-table"
          />
        </div>
        <div className="space-y-2">
          <Label>Custom Query</Label>
          <Textarea
            value={config.query || ""}
            onChange={(e) => onConfigChange("query", e.target.value)}
            placeholder='SELECT * FROM insights WHERE date >= "2023-01-01"'
            rows={4}
          />
          <p className="text-xs text-muted-foreground">SQL-like query for dashboard data</p>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="notify-on-update"
            checked={config.notify_on_update || false}
            onCheckedChange={(checked) => onConfigChange("notify_on_update", checked)}
          />
          <Label htmlFor="notify-on-update" className="text-sm">Notify on Update</Label>
        </div>
      </div>
    );
  }

  // Default/fallback for unknown analytics nodes
  return (
    <div className="space-y-4">
      <div className="p-4 border rounded-lg bg-muted/50">
        <p className="text-sm text-muted-foreground">
          Configuration for "{nodeLabel}" analytics node. Customize fields as needed.
        </p>
      </div>
      <div className="space-y-2">
        <Label>Period</Label>
        <Select
          value={config.period || "weekly"}
          onValueChange={(value) => onConfigChange("period", value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {periodOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Format</Label>
        <Select
          value={config.format || "pdf"}
          onValueChange={(value) => onConfigChange("format", value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {formatOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}