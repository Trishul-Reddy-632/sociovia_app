import { Node, Edge } from "reactflow";

export interface ValidationIssue {
  id: string;
  type: "error" | "warning";
  message: string;
  nodeId?: string;
}

export function validateWorkflow(nodes: Node[], edges: Edge[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Check for at least one trigger
  const triggers = nodes.filter((n) => n.data.nodeType === "trigger");
  if (triggers.length === 0) {
    issues.push({
      id: "no-trigger",
      type: "error",
      message: "Workflow must have at least one trigger node",
    });
  }

  // Check for orphaned nodes (no incoming or outgoing edges)
  nodes.forEach((node) => {
    const hasIncoming = edges.some((e) => e.target === node.id);
    const hasOutgoing = edges.some((e) => e.source === node.id);
    
    if (node.data.nodeType !== "trigger" && !hasIncoming && !hasOutgoing) {
      issues.push({
        id: `orphan-${node.id}`,
        type: "warning",
        message: `Node "${node.data.label}" is not connected`,
        nodeId: node.id,
      });
    }
  });

  // Check for cycles
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function hasCycle(nodeId: string): boolean {
    visited.add(nodeId);
    recursionStack.add(nodeId);

    const outgoingEdges = edges.filter((e) => e.source === nodeId);
    for (const edge of outgoingEdges) {
      if (!visited.has(edge.target)) {
        if (hasCycle(edge.target)) return true;
      } else if (recursionStack.has(edge.target)) {
        return true;
      }
    }

    recursionStack.delete(nodeId);
    return false;
  }

  for (const node of nodes) {
    if (!visited.has(node.id)) {
      if (hasCycle(node.id)) {
        issues.push({
          id: "cycle-detected",
          type: "error",
          message: "Workflow contains a cycle. Cycles are not allowed.",
        });
        break;
      }
    }
  }

  // Check for actions without approval nodes when required
  nodes.forEach((node) => {
    if (node.data.nodeType === "action") {
      const config = node.data.config || {};
      if (config.change_pct && config.change_pct > 30) {
        const hasApproval = edges.some((e) => {
          const targetNode = nodes.find((n) => n.id === e.target);
          return e.source === node.id && targetNode?.data.nodeType === "approval";
        });
        
        if (!hasApproval) {
          issues.push({
            id: `approval-${node.id}`,
            type: "warning",
            message: `Node "${node.data.label}" with large budget change should have approval`,
            nodeId: node.id,
          });
        }
      }
    }
  });

  // Check for missing required configs
  nodes.forEach((node) => {
    if (node.data.nodeType === "trigger" && node.data.label === "Cron Schedule") {
      if (!node.data.config?.schedule) {
        issues.push({
          id: `config-${node.id}`,
          type: "error",
          message: `Node "${node.data.label}" is missing schedule configuration`,
          nodeId: node.id,
        });
      }
    }
  });

  return issues;
}
