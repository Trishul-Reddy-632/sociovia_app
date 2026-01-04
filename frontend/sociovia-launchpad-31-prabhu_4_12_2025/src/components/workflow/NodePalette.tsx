import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  Filter,
  GitBranch,
  Play,
  Pause,
  Mail,
  Webhook,
  Target,
  TrendingUp,
  TrendingDown,
  Copy,
  Sparkles,
  CheckCircle,
  Bell,
  Zap,
  Calendar,
  Database,
  Settings,
  MessageCircle, // For WhatsApp
  Phone, // Alternative for WhatsApp
  AlertTriangle, // For alerts
  Users, // For group notifications
  FileText, // For reports
  BarChart3,
  MapPinIcon,
  TrashIcon,
  DownloadIcon, // For analytics
} from "lucide-react";

const nodeCategories = [
  {
    category: "Triggers",
    nodes: [
      {
        nodeType: "trigger",
        label: "Cron Schedule",
        icon: Clock,
        description: "Run workflow on schedule",
        config: { schedule: "0 2 * * *" },
      },
      {
        nodeType: "trigger",
        label: "Metric Threshold",
        icon: TrendingUp,
        description: "Trigger when metric exceeds threshold",
        config: { metric: "roas", operator: ">", value: 2.5 },
      },
      {
        nodeType: "trigger",
        label: "Manual Trigger",
        icon: Play,
        description: "Start workflow manually",
        config: {},
      },
      {
        nodeType: "trigger",
        label: "Webhook",
        icon: Webhook,
        description: "Trigger via webhook call",
        config: { url: "/webhook/..." },
      },
      // Added more triggers for completeness
      {
        nodeType: "trigger",
        label: "Event-Based",
        icon: Zap,
        description: "Trigger on custom events (e.g., lead form submit)",
        config: { event: "lead_submitted" },
      },
      {
        nodeType: "trigger",
        label: "File Upload",
        icon: FileText,
        description: "Trigger when file is uploaded to storage",
        config: { bucket: "uploads", type: "csv" },
      },
    ],
  },
  {
    category: "Selectors",
    nodes: [
      {
        nodeType: "selector",
        label: "Query Campaigns",
        icon: Target,
        description: "Select campaigns by criteria",
        config: { metric: "spend", operator: ">", value: 1000 },
      },
      {
        nodeType: "selector",
        label: "Top Performers",
        icon: TrendingUp,
        description: "Select top N by metric",
        config: { metric: "roas", limit: 5 },
      },
      {
        nodeType: "selector",
        label: "By Tags",
        icon: Database,
        description: "Select by tags or labels",
        config: { tags: ["winners"] },
      },
      // Added more selectors
      {
        nodeType: "selector",
        label: "By Audience",
        icon: Users,
        description: "Select by audience segments",
        config: { audience: "high_value" },
      },
      {
        nodeType: "selector",
        label: "Geographic Filter",
        icon: MapPinIcon, // Assume MapPin from lucide
        description: "Select by location or geo",
        config: { geo: "US", min_spend: 500 },
      },
    ],
  },
  {
    category: "Conditions",
    nodes: [
      {
        nodeType: "condition",
        label: "Compare Metric",
        icon: GitBranch,
        description: "Branch on metric value",
        config: { metric: "roas", operator: ">", value: 2.0 },
      },
      {
        nodeType: "condition",
        label: "AND/OR Logic",
        icon: GitBranch,
        description: "Combine multiple conditions",
        config: { operator: "AND" },
      },
      {
        nodeType: "condition",
        label: "AI Confidence",
        icon: Sparkles,
        description: "Check AI model confidence",
        config: { threshold: 0.8 },
      },
      // Added more conditions
      {
        nodeType: "condition",
        label: "Time Window",
        icon: Clock,
        description: "Check if within time range",
        config: { start: "09:00", end: "17:00", timezone: "UTC" },
      },
      {
        nodeType: "condition",
        label: "Compliance Check",
        icon: AlertTriangle,
        description: "Verify ad policy compliance",
        config: { rules: ["no_political", "age_18+"] },
      },
    ],
  },
  {
    category: "Actions",
    nodes: [
      {
        nodeType: "action",
        label: "Pause Campaign",
        icon: Pause,
        description: "Pause selected campaigns",
        config: {},
      },
      {
        nodeType: "action",
        label: "Resume Campaign",
        icon: Play,
        description: "Resume paused campaigns",
        config: {},
      },
      {
        nodeType: "action",
        label: "Adjust Budget",
        icon: TrendingUp,
        description: "Increase/decrease budget",
        config: { change_pct: 25 },
      },
      {
        nodeType: "action",
        label: "Duplicate AdSet",
        icon: Copy,
        description: "Create copy of adset",
        config: { budget_multiplier: 1.5 },
      },
      {
        nodeType: "action",
        label: "Swap Creative",
        icon: Sparkles,
        description: "Replace ad creative",
        config: {},
      },
      // Added more actions
      {
        nodeType: "action",
        label: "Update Targeting",
        icon: Target,
        description: "Modify audience targeting",
        config: { audience_update: "expand" },
      },
      {
        nodeType: "action",
        label: "Archive Campaign",
        icon: TrashIcon,
        description: "Archive underperforming campaigns",
        config: { reason: "low_roas" },
      },
    ],
  },
  {
    category: "Approvals",
    nodes: [
      {
        nodeType: "approval",
        label: "Request Approval",
        icon: CheckCircle,
        description: "Require human approval",
        config: { approvers: ["finance"], ttl: "24h" },
      },
      // Added more approvals
      {
        nodeType: "approval",
        label: "Multi-Step Approval",
        icon: Users,
        description: "Sequential approvals from multiple teams",
        config: { approvers: ["creative", "legal", "exec"], order: "sequential" },
      },
    ],
  },
  {
    category: "Notifications",
    nodes: [
      {
        nodeType: "notification",
        label: "Send Email",
        icon: Mail,
        description: "Send email notification",
        config: { to: "team@example.com" },
      },
      {
        nodeType: "notification",
        label: "Slack Message",
        icon: Bell,
        description: "Post to Slack channel",
        config: { channel: "#alerts" },
      },
      {
        nodeType: "notification",
        label: "Webhook",
        icon: Webhook,
        description: "Call external webhook",
        config: { url: "https://..." },
      },
      // Added WhatsApp and more
      {
        nodeType: "notification",
        label: "WhatsApp Message",
        icon: MessageCircle,
        description: "Send WhatsApp notification to contacts",
        config: { phone: "+1234567890", template: "alert_template" },
      },
      {
        nodeType: "notification",
        label: "SMS Alert",
        icon: Phone,
        description: "Send SMS via Twilio or similar",
        config: { to: "+1234567890", message: "Workflow alert" },
      },
      {
        nodeType: "notification",
        label: "Push Notification",
        icon: Bell,
        description: "Send push to mobile app users",
        config: { user_ids: [1, 2, 3] },
      },
    ],
  },
  {
    category: "AI Nodes",
    nodes: [
      {
        nodeType: "ai",
        label: "Generate Copy",
        icon: Sparkles,
        description: "AI-generate ad copy",
        config: { model: "gemini-2.5-flash" },
      },
      {
        nodeType: "ai",
        label: "Score Creative",
        icon: Sparkles,
        description: "Predict creative performance",
        config: { model: "gemini-2.5-flash" },
      },
      {
        nodeType: "ai",
        label: "Suggest Audience",
        icon: Target,
        description: "AI audience recommendations",
        config: { model: "gemini-2.5-flash" },
      },
      // Added more AI nodes
      {
        nodeType: "ai",
        label: "Optimize Bidding",
        icon: TrendingUp,
        description: "AI-suggested bid adjustments",
        config: { model: "custom_bid_model" },
      },
      {
        nodeType: "ai",
        label: "Anomaly Detection",
        icon: AlertTriangle,
        description: "Detect unusual performance patterns",
        config: { threshold: 0.95 },
      },
    ],
  },
  // Added new category for Analytics/Reporting
  {
    category: "Analytics",
    nodes: [
      {
        nodeType: "analytics",
        label: "Generate Report",
        icon: BarChart3,
        description: "Create performance report",
        config: { period: "weekly", format: "pdf" },
      },
      {
        nodeType: "analytics",
        label: "Export Data",
        icon:DownloadIcon,
        description: "Export metrics to CSV/Google Sheets",
        config: { fields: "roas,spend,conversions" },
      },
      {
        nodeType: "analytics",
        label: "Dashboard Update",
        icon: Settings,
        description: "Update live dashboard metrics",
        config: { dashboard_id: "main" },
      },
    ],
  },
];

export function NodePalette() {
  const onDragStart = (event: React.DragEvent, nodeData: any) => {
    event.dataTransfer.setData("application/reactflow", JSON.stringify(nodeData));
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <Card className="w-80 border-r rounded-none h-full">
      <CardHeader className="border-b">
        <CardTitle className="text-lg">Node Palette</CardTitle>
        <CardDescription>Drag nodes onto canvas</CardDescription>
      </CardHeader>
      <ScrollArea className="h-[calc(100vh-180px)]">
        <CardContent className="p-4 space-y-6">
          {nodeCategories.map((category) => (
            <div key={category.category}>
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                {category.category}
                <Badge variant="secondary" className="text-xs">
                  {category.nodes.length}
                </Badge>
              </h3>
              <div className="space-y-2">
                {category.nodes.map((node) => {
                  const Icon = node.icon;
                  return (
                    <div
                      key={node.label}
                      draggable
                      onDragStart={(e) => onDragStart(e, node)}
                      className="
                        p-3 border rounded-lg cursor-grab active:cursor-grabbing
                        hover:border-primary hover:shadow-md transition-all
                        bg-card hover:bg-accent
                      "
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`
                          w-8 h-8 rounded flex items-center justify-center flex-shrink-0
                          ${node.nodeType === "trigger" ? "bg-blue-500" : ""}
                          ${node.nodeType === "selector" ? "bg-cyan-500" : ""}
                          ${node.nodeType === "condition" ? "bg-amber-500" : ""}
                          ${node.nodeType === "action" ? "bg-green-500" : ""}
                          ${node.nodeType === "approval" ? "bg-purple-500" : ""}
                          ${node.nodeType === "notification" ? "bg-pink-500" : ""}
                          ${node.nodeType === "ai" ? "bg-violet-500" : ""}
                          ${node.nodeType === "analytics" ? "bg-indigo-500" : ""}
                        `}
                        >
                          <Icon className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{node.label}</div>
                          <div className="text-xs text-muted-foreground line-clamp-2">{node.description}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </CardContent>
      </ScrollArea>
    </Card>
  );
}