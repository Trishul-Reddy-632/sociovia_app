import React, { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { Badge } from "@/components/ui/badge"; // your named import (works per logs)
import * as Lucide from "lucide-react";
const { Sparkles } = Lucide;

// Reliable local check for components (avoids React.isValidElementType which may be missing)
const isComponent = (val: any) => {
  if (!val) return false;
  const t = typeof val;
  if (t === "function") return true; // function components & classes
  if (t === "object") {
    // forwardRef / memo are objects with $$typeof, and some libs use .render
    if ("$$typeof" in val || "render" in val) return true;
  }
  return false;
};

const statusColors = {
  idle: "bg-muted text-muted-foreground",
  running: "bg-blue-500 text-white animate-pulse",
  success: "bg-green-500 text-white",
  error: "bg-red-500 text-white",
};

const typeColors = {
  trigger: "border-blue-500 bg-blue-50 dark:bg-blue-950",
  condition: "border-amber-500 bg-amber-50 dark:bg-amber-950",
  action: "border-green-500 bg-green-50 dark:bg-green-950",
  approval: "border-purple-500 bg-purple-50 dark:bg-purple-950",
  selector: "border-cyan-500 bg-cyan-50 dark:bg-cyan-950",
  notification: "border-pink-500 bg-pink-50 dark:bg-pink-950",
  ai: "border-violet-500 bg-violet-50 dark:bg-violet-950",
};

export const WorkflowNode = memo(({ data, selected }: NodeProps) => {
  // pick icon candidate (allow string names mapped to lucide icons)
  let IconCandidate: any = data?.icon ?? Sparkles;
  if (typeof IconCandidate === "string") {
    IconCandidate = (Lucide as any)[IconCandidate] ?? Sparkles;
  }

  // dev diagnostics
  if (process.env.NODE_ENV !== "production") {
    console.log("Badge (import) ->", Badge);
    console.log("IconCandidate ->", IconCandidate);
  }

  const Icon = isComponent(IconCandidate) ? IconCandidate : Sparkles;
  const nodeType = data.nodeType || "action";
  const status = data.status || "idle";

  return (
    <div
      className={`
        px-4 py-3 shadow-lg rounded-lg border-2 bg-card min-w-[200px] transition-all
        ${selected ? "ring-2 ring-primary shadow-xl" : ""}
        ${typeColors[nodeType as keyof typeof typeColors] || "border-muted"}
      `}
    >
      {nodeType !== "trigger" && (
        <Handle
          type="target"
          position={Position.Top}
          className="w-3 h-3 !bg-primary border-2 border-background"
        />
      )}

      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <div
            className={`
            w-8 h-8 rounded-lg flex items-center justify-center
            ${nodeType === "trigger" ? "bg-blue-500" : ""}
            ${nodeType === "condition" ? "bg-amber-500" : ""}
            ${nodeType === "action" ? "bg-green-500" : ""}
            ${nodeType === "approval" ? "bg-purple-500" : ""}
            ${nodeType === "selector" ? "bg-cyan-500" : ""}
            ${nodeType === "notification" ? "bg-pink-500" : ""}
            ${nodeType === "ai" ? "bg-violet-500" : ""}
          `}
          >
            {isComponent(Icon) ? <Icon className="w-4 h-4 text-white" /> : <span className="w-4 h-4 block" />}
          </div>

          <div className="flex-1">
            <div className="font-semibold text-sm">{data.label}</div>
            <div className="text-xs text-muted-foreground capitalize">{nodeType}</div>
          </div>
        </div>

        {isComponent(Badge) ? (
          <Badge variant="secondary" className={statusColors[status as keyof typeof statusColors]}>
            {status}
          </Badge>
        ) : (
          <div className={`px-2 py-1 rounded text-xs ${statusColors[status as keyof typeof statusColors]}`}>
            {status}
          </div>
        )}
      </div>

      {data.description && (
        <div className="text-xs text-muted-foreground mb-2 line-clamp-2">{data.description}</div>
      )}

      {data.config && Object.keys(data.config).length > 0 && (
        <div className="text-xs bg-muted/50 rounded px-2 py-1 font-mono">
          {Object.entries(data.config)
            .slice(0, 2)
            .map(([key, value]) => {
              let displayValue: any = value;
              if (Array.isArray(value)) displayValue = value.join(", ");
              else if (typeof value === "object" && value !== null) displayValue = JSON.stringify(value);
              return (
                <div key={key} className="truncate">
                  {key}: {String(displayValue)}
                </div>
              );
            })}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-primary border-2 border-background"
      />
    </div>
  );
});

WorkflowNode.displayName = "WorkflowNode";
