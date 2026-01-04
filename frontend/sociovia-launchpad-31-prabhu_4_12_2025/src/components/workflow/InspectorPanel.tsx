// src/components/workflow/InspectorPanel.tsx
import React, { useState, useEffect } from "react";
import { Node } from "reactflow";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

import {
  Settings,
  Trash,
  Copy,
  Play,
  Shield,
  Clock,
  BarChart3, // Added for analytics
  AlertTriangle, // For safety/warnings
} from "lucide-react";

import { TriggerConfig } from "./node-configs/TriggerConfig";
import { SelectorConfig } from "./node-configs/SelectorConfig";
import { ConditionConfig } from "./node-configs/ConditionConfig";
import { ActionConfig } from "./node-configs/ActionConfig";
import { ApprovalConfig } from "./node-configs/ApprovalConfig";
import { NotificationConfig } from "./node-configs/NotificationConfig";
import { AINodeConfig } from "./node-configs/AINodeConfig";
import { AnalyticsConfig } from "./node-configs/AnalyticsConfig"; // New import for analytics

import * as Lucide from "lucide-react"; // for icon name mapping & fallbacks

interface InspectorPanelProps {
  selectedNode: Node | null;
  onUpdateNode: (nodeId: string, data: any) => void;
  onDeleteNode: () => void;
  onDuplicateNode: () => void;
}

/** Helpers **/
const isComponent = (val: any) => {
  if (!val) return false;
  const t = typeof val;
  if (t === "function") return true; // function components & class components
  if (t === "object") {
    // forwardRef / memo etc often have $$typeof OR a render prop
    if ("$$typeof" in val || "render" in val) return true;
  }
  return false;
};

// Resolve an icon from many shapes:
// - string: map to lucide icon by name (e.g., "Play")
// - function/class: return as-is
// - object: try .default, .Icon, or treat as module namespace and take first suitable export
const resolveIcon = (candidate: any) => {
  if (!candidate) return null;
  if (typeof candidate === "string") {
    return (Lucide as any)[candidate] ?? null;
  }
  if (isComponent(candidate)) return candidate;
  if (typeof candidate === "object") {
    // try .default (ESM default), then .Icon, then named exports looking for a function
    if (isComponent(candidate.default)) return candidate.default;
    if (isComponent(candidate.Icon)) return candidate.Icon;
    // if module namespace (e.g., { Play: fn, Sparkles: fn }), try to guess by key
    const firstFn = Object.values(candidate).find(isComponent);
    if (firstFn) return firstFn;
  }
  return null;
};

/** Create safe wrappers for everything we import from UI */
const SafeCard: any = isComponent(Card)
  ? Card
  : ({ children, className, ...rest }: any) => <div className={className} {...rest}>{children}</div>;
const SafeCardHeader: any = isComponent(CardHeader)
  ? CardHeader
  : ({ children, className, ...rest }: any) => <div className={className} {...rest}>{children}</div>;
const SafeCardContent: any = isComponent(CardContent)
  ? CardContent
  : ({ children, className, ...rest }: any) => <div className={className} {...rest}>{children}</div>;
const SafeCardTitle: any = isComponent(CardTitle)
  ? CardTitle
  : ({ children, className, ...rest }: any) => <div className={className} {...rest}>{children}</div>;
const SafeCardDescription: any = isComponent(CardDescription)
  ? CardDescription
  : ({ children, className, ...rest }: any) => <div className={className} {...rest}>{children}</div>;

const SafeButton: any = isComponent(Button)
  ? Button
  : ({ children, className, ...rest }: any) => <button className={className} {...rest}>{children}</button>;
const SafeInput: any = isComponent(Input)
  ? Input
  : ({ ...rest }: any) => <input {...rest} />;
const SafeLabel: any = isComponent(Label)
  ? Label
  : ({ children, className, ...rest }: any) => <label className={className} {...rest}>{children}</label>;

const SafeTabs: any = isComponent(Tabs) ? Tabs : ({ children, ...rest }: any) => <div {...rest}>{children}</div>;
const SafeTabsList: any = isComponent(TabsList) ? TabsList : ({ children, ...rest }: any) => <div {...rest}>{children}</div>;
const SafeTabsTrigger: any = isComponent(TabsTrigger) ? TabsTrigger : ({ children, ...rest }: any) => <button {...rest}>{children}</button>;
const SafeTabsContent: any = isComponent(TabsContent) ? TabsContent : ({ children, ...rest }: any) => <div {...rest}>{children}</div>;

const SafeScrollArea: any = isComponent(ScrollArea) ? ScrollArea : ({ children, ...rest }: any) => <div {...rest}>{children}</div>;
const SafeBadge: any = isComponent(Badge) ? Badge : ({ children, className, ...rest }: any) => <div className={className} {...rest}>{children}</div>;
const SafeSeparator: any = isComponent(Separator) ? Separator : ({ className, ...rest }: any) => <hr className={className} {...rest} />;
const SafeTextarea: any = isComponent(Textarea) ? Textarea : ({ ...rest }: any) => <textarea {...rest} />;

/** DEBUG logs to find broken imports (check browser console) */
if (process.env.NODE_ENV !== "production") {
  // eslint-disable-next-line no-console
  console.log("InspectorPanel imports:", {
    Card, CardHeader, CardContent, CardTitle, CardDescription,
    Button, Input, Label,
    Tabs, TabsList, TabsTrigger, TabsContent,
    ScrollArea, Badge, Separator, Textarea,
  });
}

export function InspectorPanel({
  selectedNode,
  onUpdateNode,
  onDeleteNode,
  onDuplicateNode,
}: InspectorPanelProps) {
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [config, setConfig] = useState<Record<string, any>>({});

  useEffect(() => {
    if (selectedNode) {
      setLabel(selectedNode.data.label || "");
      setDescription(selectedNode.data.description || "");
      setConfig(selectedNode.data.config || {});
    }
  }, [selectedNode]);

  const handleSave = () => {
    if (selectedNode) {
      onUpdateNode(selectedNode.id, {
        label,
        description,
        config,
      });
    }
  };

  const updateConfig = (key: string, value: any) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  if (!selectedNode) {
    return (
      <SafeCard className="w-96 border-l rounded-none h-full">
        <SafeCardContent className="flex items-center justify-center h-full">
          <div className="text-center text-muted-foreground p-6">
            <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">Select a node to view properties</p>
          </div>
        </SafeCardContent>
      </SafeCard>
    );
  }

  // Resolve icon safely
  const Icon = resolveIcon(selectedNode.data.icon);

  // Dev log the selectedNode.icon shape
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.log("selectedNode.data.icon ->", selectedNode.data.icon);
    // eslint-disable-next-line no-console
    console.log("resolved Icon ->", Icon);
  }

  return (
    <SafeCard className="w-96 border-l rounded-none h-full flex flex-col">
      <SafeCardHeader className="border-b">
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center
              ${selectedNode.data.nodeType === "trigger" ? "bg-blue-500" : ""}
              ${selectedNode.data.nodeType === "condition" ? "bg-amber-500" : ""}
              ${selectedNode.data.nodeType === "action" ? "bg-green-500" : ""}
              ${selectedNode.data.nodeType === "approval" ? "bg-purple-500" : ""}
              ${selectedNode.data.nodeType === "selector" ? "bg-cyan-500" : ""}
              ${selectedNode.data.nodeType === "notification" ? "bg-pink-500" : ""}
              ${selectedNode.data.nodeType === "ai" ? "bg-violet-500" : ""}
              ${selectedNode.data.nodeType === "analytics" ? "bg-indigo-500" : ""}
            `}
          >
            {isComponent(Icon) ? <Icon className="w-5 h-5 text-white" /> : null}
          </div>

          <div className="flex-1">
            <SafeCardTitle className="text-lg">Node Inspector</SafeCardTitle>
            <SafeCardDescription className="capitalize">{selectedNode.data.nodeType} node</SafeCardDescription>
          </div>
        </div>
      </SafeCardHeader>

      <SafeScrollArea className="flex-1">
        <SafeCardContent className="p-4 space-y-4">
          <SafeTabs defaultValue="config" className="w-full">
            <SafeTabsList className="grid w-full grid-cols-3">
              <SafeTabsTrigger value="config">Config</SafeTabsTrigger>
              <SafeTabsTrigger value="safety">Safety</SafeTabsTrigger>
              <SafeTabsTrigger value="test">Test</SafeTabsTrigger>
            </SafeTabsList>

            <SafeTabsContent value="config" className="space-y-4 mt-4">
              <div className="space-y-2">
                <SafeLabel htmlFor="label">Node Label</SafeLabel>
                <SafeInput
                  id="label"
                  value={label}
                  onChange={(e: any) => setLabel(e.target.value)}
                  placeholder="Enter node label"
                />
              </div>

              <div className="space-y-2">
                <SafeLabel htmlFor="description">Description</SafeLabel>
                <SafeTextarea
                  id="description"
                  value={description}
                  onChange={(e: any) => setDescription(e.target.value)}
                  placeholder="Enter description"
                  rows={3}
                />
              </div>

              <SafeSeparator />

              <div className="space-y-3">
                <SafeLabel className="text-sm font-semibold">Node Configuration</SafeLabel>

                {selectedNode.data.nodeType === "trigger" && (
                  <TriggerConfig
                    config={config}
                    onConfigChange={updateConfig}
                    nodeLabel={selectedNode.data.label}
                  />
                )}

                {selectedNode.data.nodeType === "selector" && (
                  <SelectorConfig
                    config={config}
                    onConfigChange={updateConfig}
                    nodeLabel={selectedNode.data.label}
                  />
                )}

                {selectedNode.data.nodeType === "condition" && (
                  <ConditionConfig
                    config={config}
                    onConfigChange={updateConfig}
                    nodeLabel={selectedNode.data.label}
                  />
                )}

                {selectedNode.data.nodeType === "action" && (
                  <ActionConfig
                    config={config}
                    onConfigChange={updateConfig}
                    nodeLabel={selectedNode.data.label}
                  />
                )}

                {selectedNode.data.nodeType === "approval" && (
                  <ApprovalConfig config={config} onConfigChange={updateConfig} />
                )}

                {selectedNode.data.nodeType === "notification" && (
                  <NotificationConfig
                    config={config}
                    onConfigChange={updateConfig}
                    nodeLabel={selectedNode.data.label}
                  />
                )}

                {selectedNode.data.nodeType === "ai" && (
                  <AINodeConfig
                    config={config}
                    onConfigChange={updateConfig}
                    nodeLabel={selectedNode.data.label}
                  />
                )}

                {selectedNode.data.nodeType === "analytics" && (
                  <AnalyticsConfig
                    config={config}
                    onConfigChange={updateConfig}
                    nodeLabel={selectedNode.data.label}
                  />
                )}
              </div>

              <SafeSeparator />

              <div className="space-y-2">
                <SafeLabel className="text-sm font-semibold">Node ID</SafeLabel>
                <div className="text-xs font-mono bg-muted p-2 rounded">{selectedNode.id}</div>
              </div>
            </SafeTabsContent>

            <SafeTabsContent value="safety" className="space-y-4 mt-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 border rounded-lg bg-amber-50 dark:bg-amber-950">
                  <Shield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <div className="font-semibold mb-1">Safety Controls</div>
                    <div className="text-muted-foreground text-xs">
                      Configure approval requirements and spend caps for this action
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <SafeLabel htmlFor="approval">Requires Approval</SafeLabel>
                  <select id="approval" className="w-full border rounded-md px-3 py-2">
                    <option value="never">Never</option>
                    <option value="always">Always</option>
                    <option value="threshold">Above Threshold</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <SafeLabel htmlFor="threshold">Approval Threshold</SafeLabel>
                  <SafeInput id="threshold" type="number" placeholder="Enter amount" defaultValue={10000} />
                  <p className="text-xs text-muted-foreground">
                    Require approval if action affects budget above this amount
                  </p>
                </div>

                <div className="space-y-2">
                  <SafeLabel htmlFor="approvers">Approvers</SafeLabel>
                  <SafeInput id="approvers" placeholder="finance, manager" defaultValue="finance" />
                  <p className="text-xs text-muted-foreground">
                    Comma-separated list of roles or users
                  </p>
                </div>

                <div className="space-y-2">
                  <SafeLabel htmlFor="max-spend">Max Spend Per Run</SafeLabel>
                  <SafeInput id="max-spend" type="number" placeholder="Enter max spend" defaultValue={50000} />
                </div>

                {/* Added for analytics-specific safety */}
                {selectedNode.data.nodeType === "analytics" && (
                  <div className="space-y-2">
                    <SafeLabel htmlFor="data-privacy">Data Privacy Mode</SafeLabel>
                    <select id="data-privacy" className="w-full border rounded-md px-3 py-2">
                      <option value="anonymized">Anonymized Export</option>
                      <option value="full">Full Data</option>
                      <option value="summary">Summary Only</option>
                    </select>
                    <p className="text-xs text-muted-foreground">Control PII exposure in reports</p>
                  </div>
                )}
              </div>
            </SafeTabsContent>

            <SafeTabsContent value="test" className="space-y-4 mt-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 border rounded-lg bg-blue-50 dark:bg-blue-950">
                  <Play className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <div className="font-semibold mb-1">Test Node</div>
                    <div className="text-muted-foreground text-xs">
                      Run this node in isolation with sample data
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <SafeLabel htmlFor="test-input">Test Input (JSON)</SafeLabel>
                  <SafeTextarea
                    id="test-input"
                    placeholder='{"campaign_id": "123", "metric": "roas", "value": 2.5}'
                    rows={4}
                    className="font-mono text-xs"
                  />
                </div>

                <SafeButton className="w-full">
                  <Play className="w-4 h-4 mr-2" />
                  Run Test
                </SafeButton>

                <div className="border rounded-lg p-3 bg-muted/50">
                  <SafeLabel className="text-xs font-semibold mb-2 block">Test Output</SafeLabel>
                  <div className="text-xs font-mono text-muted-foreground">
                    Run test to see output
                  </div>
                </div>

                <div className="space-y-2">
                  <SafeLabel className="text-xs font-semibold">Recent Executions</SafeLabel>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs p-2 border rounded">
                      <span className="text-muted-foreground">
                        <Clock className="w-3 h-3 inline mr-1" />
                        2 hours ago
                      </span>
                      <SafeBadge variant="default" className="bg-green-500">Success</SafeBadge>
                    </div>
                    <div className="flex items-center justify-between text-xs p-2 border rounded">
                      <span className="text-muted-foreground">
                        <Clock className="w-3 h-3 inline mr-1" />
                        1 day ago
                      </span>
                      <SafeBadge variant="default" className="bg-green-500">Success</SafeBadge>
                    </div>
                  </div>
                </div>

                {/* Added analytics-specific test section */}
                {selectedNode.data.nodeType === "analytics" && (
                  <div className="space-y-2 pt-4 border-t">
                    <SafeLabel className="text-xs font-semibold">Sample Report Preview</SafeLabel>
                    <div className="border rounded-lg p-3 bg-muted/20">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-medium">Weekly ROAS</span>
                        <SafeBadge className="bg-green-500 text-xs">2.1</SafeBadge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Spend: $1,234 | Conversions: 45
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </SafeTabsContent>
          </SafeTabs>
        </SafeCardContent>
      </SafeScrollArea>

      <div className="border-t p-4 space-y-2">
        <SafeButton className="w-full" onClick={handleSave}>
          <Settings className="w-4 h-4 mr-2" />
          Save Changes
        </SafeButton>

        <div className="flex gap-2">
          <SafeButton variant="outline" className="flex-1" onClick={onDuplicateNode}>
            <Copy className="w-4 h-4 mr-2" />
            Duplicate
          </SafeButton>
          <SafeButton variant="destructive" className="flex-1" onClick={onDeleteNode}>
            <Trash className="w-4 h-4 mr-2" />
            Delete
          </SafeButton>
        </div>
      </div>
    </SafeCard>
  );
}