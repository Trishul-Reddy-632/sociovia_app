import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ConditionConfigProps {
  config: Record<string, any>;
  onConfigChange: (key: string, value: any) => void;
  nodeLabel: string;
}

export function ConditionConfig({ config, onConfigChange, nodeLabel }: ConditionConfigProps) {
  // Compare Metric
  if (nodeLabel.includes("Compare")) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Metric to Compare</Label>
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
              <SelectItem value="conversions">Conversions</SelectItem>
              <SelectItem value="spend">Spend</SelectItem>
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
              <SelectItem value="==">Equal</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Threshold Value</Label>
          <Input
            type="number"
            step="0.01"
            value={config.value || 2.0}
            onChange={(e) => onConfigChange("value", parseFloat(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          <Label>On True, Continue to</Label>
          <Select
            value={config.true_path || "next"}
            onValueChange={(value) => onConfigChange("true_path", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="next">Next Node</SelectItem>
              <SelectItem value="skip">Skip Next Node</SelectItem>
              <SelectItem value="end">End Workflow</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  }

  // AND/OR Logic
  if (nodeLabel.includes("AND") || nodeLabel.includes("OR") || nodeLabel.includes("Logic")) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Logic Operator</Label>
          <Select
            value={config.operator || "AND"}
            onValueChange={(value) => onConfigChange("operator", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AND">AND (all must be true)</SelectItem>
              <SelectItem value="OR">OR (any must be true)</SelectItem>
              <SelectItem value="NOT">NOT (negate condition)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="p-4 border rounded-lg bg-muted/50">
          <p className="text-sm text-muted-foreground">
            This node combines conditions from multiple incoming connections using the selected logic operator.
          </p>
        </div>
      </div>
    );
  }

  // AI Confidence
  if (nodeLabel.includes("AI") || nodeLabel.includes("Confidence")) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Model</Label>
          <Select
            value={config.model || "google/gemini-2.5-flash"}
            onValueChange={(value) => onConfigChange("model", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="google/gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
              <SelectItem value="google/gemini-2.5-pro">Gemini 2.5 Pro</SelectItem>
              <SelectItem value="openai/gpt-5-mini">GPT-5 Mini</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Minimum Confidence Threshold</Label>
          <Input
            type="number"
            step="0.05"
            min="0"
            max="1"
            value={config.threshold || 0.8}
            onChange={(e) => onConfigChange("threshold", parseFloat(e.target.value))}
          />
          <p className="text-xs text-muted-foreground">
            Only proceed if AI confidence is above this threshold (0.0 - 1.0)
          </p>
        </div>
        <div className="space-y-2">
          <Label>Analysis Context</Label>
          <Select
            value={config.context || "campaign_performance"}
            onValueChange={(value) => onConfigChange("context", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="campaign_performance">Campaign Performance</SelectItem>
              <SelectItem value="creative_quality">Creative Quality</SelectItem>
              <SelectItem value="audience_match">Audience Match</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  }

  return null;
}
