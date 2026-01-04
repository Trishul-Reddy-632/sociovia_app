import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AINodeConfigProps {
  config: Record<string, any>;
  onConfigChange: (key: string, value: any) => void;
  nodeLabel: string;
}

export function AINodeConfig({ config, onConfigChange, nodeLabel }: AINodeConfigProps) {
  // Generate Copy
  if (nodeLabel.includes("Generate") || nodeLabel.includes("Copy")) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>AI Model</Label>
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
              <SelectItem value="openai/gpt-5">GPT-5</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Copy Type</Label>
          <Select
            value={config.copy_type || "ad_headline"}
            onValueChange={(value) => onConfigChange("copy_type", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ad_headline">Ad Headline</SelectItem>
              <SelectItem value="ad_description">Ad Description</SelectItem>
              <SelectItem value="social_post">Social Media Post</SelectItem>
              <SelectItem value="email_subject">Email Subject</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Tone</Label>
          <Select
            value={config.tone || "professional"}
            onValueChange={(value) => onConfigChange("tone", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="professional">Professional</SelectItem>
              <SelectItem value="casual">Casual</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="friendly">Friendly</SelectItem>
              <SelectItem value="persuasive">Persuasive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Context / Brand Voice</Label>
          <Textarea
            value={config.context || ""}
            onChange={(e) => onConfigChange("context", e.target.value)}
            placeholder="Describe your brand voice, target audience, and key messages..."
            rows={4}
          />
        </div>
        <div className="space-y-2">
          <Label>Number of Variations</Label>
          <Input
            type="number"
            min={1}
            max={2}
            value={config.num_variations || 3}
            onChange={(e) => onConfigChange("num_variations", parseInt(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          <Label>Max Length (characters)</Label>
          <Input
            type="number"
            value={config.max_length || 125}
            onChange={(e) => onConfigChange("max_length", parseInt(e.target.value))}
          />
        </div>
      </div>
    );
  }

  // Score Creative
  if (nodeLabel.includes("Score")) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>AI Model</Label>
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
          <Label>Scoring Criteria</Label>
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.criteria?.includes("visual_appeal") || false}
                onChange={(e) => {
                  const criteria = config.criteria || [];
                  if (e.target.checked) {
                    onConfigChange("criteria", [...criteria, "visual_appeal"]);
                  } else {
                    onConfigChange("criteria", criteria.filter((c: string) => c !== "visual_appeal"));
                  }
                }}
              />
              <span className="text-sm">Visual Appeal</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.criteria?.includes("message_clarity") || false}
                onChange={(e) => {
                  const criteria = config.criteria || [];
                  if (e.target.checked) {
                    onConfigChange("criteria", [...criteria, "message_clarity"]);
                  } else {
                    onConfigChange("criteria", criteria.filter((c: string) => c !== "message_clarity"));
                  }
                }}
              />
              <span className="text-sm">Message Clarity</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.criteria?.includes("brand_alignment") || false}
                onChange={(e) => {
                  const criteria = config.criteria || [];
                  if (e.target.checked) {
                    onConfigChange("criteria", [...criteria, "brand_alignment"]);
                  } else {
                    onConfigChange("criteria", criteria.filter((c: string) => c !== "brand_alignment"));
                  }
                }}
              />
              <span className="text-sm">Brand Alignment</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.criteria?.includes("cta_strength") || false}
                onChange={(e) => {
                  const criteria = config.criteria || [];
                  if (e.target.checked) {
                    onConfigChange("criteria", [...criteria, "cta_strength"]);
                  } else {
                    onConfigChange("criteria", criteria.filter((c: string) => c !== "cta_strength"));
                  }
                }}
              />
              <span className="text-sm">CTA Strength</span>
            </label>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Minimum Score Threshold</Label>
          <Input
            type="number"
            step="0.1"
            min="0"
            max="10"
            value={config.min_score || 7.0}
            onChange={(e) => onConfigChange("min_score", parseFloat(e.target.value))}
          />
          <p className="text-xs text-muted-foreground">
            Only use creatives with scores above this (0-10 scale)
          </p>
        </div>
      </div>
    );
  }

  // Suggest Audience
  if (nodeLabel.includes("Audience") || nodeLabel.includes("Suggest")) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>AI Model</Label>
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
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Analysis Basis</Label>
          <Select
            value={config.analysis_basis || "top_performers"}
            onValueChange={(value) => onConfigChange("analysis_basis", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="top_performers">Top Performing Campaigns</SelectItem>
              <SelectItem value="product_data">Product/Service Data</SelectItem>
              <SelectItem value="customer_data">Customer Demographics</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Number of Suggestions</Label>
          <Input
            type="number"
            min={1}
            max={10}
            value={config.num_suggestions || 5}
            onChange={(e) => onConfigChange("num_suggestions", parseInt(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          <Label>Additional Context</Label>
          <Textarea
            value={config.context || ""}
            onChange={(e) => onConfigChange("context", e.target.value)}
            placeholder="Add any specific requirements or context for audience suggestions..."
            rows={3}
          />
        </div>
      </div>
    );
  }

  return null;
}
