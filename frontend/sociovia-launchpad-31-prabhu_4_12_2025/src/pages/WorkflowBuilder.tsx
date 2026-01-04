// src/pages/WorkflowBuilder.tsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
  Panel,
} from "reactflow";
import {
  Zap,
  GitBranch,
  Undo,
  Redo,
  ZoomIn,
  ZoomOut,
  Maximize,
  Download,
  Upload,
  Clock,
  Filter,
  TrendingDown,
  TrendingUp,
  Mail,
  Settings,
  Activity,
  Pause,
  Trash,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import "reactflow/dist/style.css";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import {
  Workflow,
  Play,
  Save,
  CheckCircle,
  Loader2,
  X,
  Copy,
  MessageSquare,
  List,
  AlertCircle,
} from "lucide-react";
import { WorkflowNode } from "@/components/workflow/WorkflowNode";
import { NodePalette } from "@/components/workflow/NodePalette";
import { InspectorPanel } from "@/components/workflow/InspectorPanel";
import {
  WorkflowTemplates,
  WorkflowTemplate,
  workflowTemplates,
} from "@/components/workflow/WorkflowTemplates";
import {
  validateWorkflow,
  ValidationIssue,
} from "@/components/workflow/WorkflowValidator";
import { WorkflowRunsTable } from "@/components/workflow/WorkflowRunsTable";
import FloatingAssistant, {
  AssistantWorkflowPayload,
} from "@/pages/Assistant";
import { api } from "@/services/api";
import { API_ENDPOINT } from "@/config";

/**
 * Notes:
 * - Set REACT_APP_API_BASE in your .env if you want to change the API root (defaults to your dev-tunnel).
 * - This component expects the backend endpoints described in your API contract (GET /workflows/templates, POST /workflows, POST /workflows/dry-run, GET /workflows/custom, GET /workflows/runs).
 */

const API_BASE = API_ENDPOINT;

// register node type
const nodeTypes = { workflow: WorkflowNode };

const initialNodes: Node[] = [
  {
    id: "trigger-1",
    type: "workflow",
    position: { x: 100, y: 100 },
    data: {
      label: "Daily Trigger",
      nodeType: "trigger",
      icon: Workflow,
      description: "Runs every day at 2 AM",
      config: { schedule: "0 2 * * *" },
      status: "idle",
    },
  },
];

const initialEdges: Edge[] = [];

const nodeColorMap = {
  trigger: "#3b82f6",
  condition: "#f59e0b",
  action: "#10b981",
  approval: "#8b5cf6",
  selector: "#06b6d4",
  notification: "#ec4899",
  ai: "#8b5cf6",
  analytics: "#4f46e5",
} as const;

export default function WorkflowBuilder() {
  const navigate = useNavigate();

  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // UI state
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [workflowName, setWorkflowName] = useState("Scale Winners Daily");
  const [isEnabled, setIsEnabled] = useState(false);

  // templates/custom workflows
  const [showTemplates, setShowTemplates] = useState(false);
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  const [showCustomWorkflows, setShowCustomWorkflows] = useState(false);
  const [customWorkflows, setCustomWorkflows] = useState<WorkflowTemplate[]>(
    []
  );
  const [customLoading, setCustomLoading] = useState(false);

  // validation & runs
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>(
    []
  );
  const [showValidation, setShowValidation] = useState(false);
  const [workflowRuns, setWorkflowRuns] = useState<any[]>([]);
  const [runsLoading, setRunsLoading] = useState(false);

  // loading states
  const [isDryRunning, setIsDryRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // assistant UI (simulated in this component, separate from FloatingAssistant FAB)
  const [showAssistant, setShowAssistant] = useState(false);
  const [chatMessages, setChatMessages] = useState<
    { id: string; sender: "user" | "assistant"; text: string; suggestion?: any }[]
  >([]);
  const [chatInput, setChatInput] = useState("");
  const [assistantThinking, setAssistantThinking] = useState(false);

  // workspace context (same as dashboard selection)
  const [workspaceId, setWorkspaceId] = useState<number | null>(null);

  // refs for keyboard callbacks
  const saveWorkflowRef = useRef<() => void>(() => { });
  const deleteNodeRef = useRef<() => void>(() => { });

  // user from storage
  const storedUser = (() => {
    try {
      return JSON.parse(
        sessionStorage.getItem("sv_user") ||
        localStorage.getItem("sv_user") ||
        "null"
      );
    } catch {
      return null;
    }
  })();

  // redirect if no user (handled via useEffect to avoid conditional hooks)
  useEffect(() => {
    if (!storedUser) {
      navigate("/login");
    }
  }, [storedUser, navigate]);

  // restore workspaceId same as dashboard (sv_selected_workspace_id)
  useEffect(() => {
    try {
      const persisted =
        sessionStorage.getItem("sv_selected_workspace_id") ||
        localStorage.getItem("sv_selected_workspace_id");
      if (persisted) {
        const pid = Number(persisted);
        if (!Number.isNaN(pid)) {
          setWorkspaceId(pid);
        } else {
          setWorkspaceId(null);
        }
      } else {
        setWorkspaceId(null);
      }
    } catch {
      setWorkspaceId(null);
    }
  }, []);

  // keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "s") {
          e.preventDefault();
          saveWorkflowRef.current?.();
        }
      }
      if (e.key === "Delete") {
        if (selectedNode) {
          e.preventDefault();
          deleteNodeRef.current?.();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedNode]);

  // ReactFlow callbacks
  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback(
    (_: any, node: Node) => setSelectedNode(node),
    []
  );
  const onPaneClick = useCallback(() => setSelectedNode(null), []);
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData("application/reactflow");
      if (!type) return;
      const nodeData = JSON.parse(type);
      const position = { x: event.clientX - 250, y: event.clientY - 100 };
      const newNode: Node = {
        id: `${nodeData.nodeType}-${Date.now()}`,
        type: "workflow",
        position,
        data: { ...nodeData, status: "idle" },
      };
      setNodes((nds) => nds.concat(newNode));
      toast({
        title: "Node added",
        description: `${nodeData.label} added to canvas`,
      });
    },
    [setNodes]
  );

  const updateNodeData = useCallback(
    (nodeId: string, data: any) => {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node
        )
      );
    },
    [setNodes]
  );

  const deleteNode = useCallback(() => {
    if (!selectedNode) return;
    if (!confirm(`Delete "${selectedNode.data.label}"? This cannot be undone.`))
      return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
    setEdges((eds) =>
      eds.filter(
        (e) => e.source !== selectedNode.id && e.target !== selectedNode.id
      )
    );
    setSelectedNode(null);
    toast({
      title: "Node deleted",
      description: "Node removed from workflow",
      variant: "destructive",
    });
  }, [selectedNode, setNodes, setEdges]);

  const duplicateNode = useCallback(() => {
    if (!selectedNode) return;
    const newNode: Node = {
      ...selectedNode,
      id: `${selectedNode.data.nodeType}-${Date.now()}`,
      position: {
        x: (selectedNode.position as any).x + 50,
        y: (selectedNode.position as any).y + 50,
      },
    };
    setNodes((nds) => nds.concat(newNode));
    toast({
      title: "Node duplicated",
      description: "New node created",
    });
  }, [selectedNode, setNodes]);

  const loadTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    try {
      // Directly use the imported static templates
      setTemplates(workflowTemplates);
    } catch (err) {
      console.error("Failed to load templates:", err);
      toast({
        title: "Failed to load templates",
        description: String(err),
        variant: "destructive",
      });
      setTemplates([]);
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  // load custom workflows
  const loadCustomWorkflows = useCallback(async () => {
    setCustomLoading(true);
    try {
      const res = await fetch(`${API_BASE}/workflows/custom`, { // Keeping this as raw fetch for now as api.ts doesn't have getCustomWorkflows yet, or I should add it.
        method: "GET",
        credentials: "include",
      });
      if (!res.ok) throw new Error(`Custom workflows fetch failed (${res.status})`);
      const json = await res.json();
      setCustomWorkflows(Array.isArray(json.workflows) ? json.workflows : []);
    } catch (err) {
      console.error("Failed to load custom workflows:", err);
      toast({
        title: "Failed to load custom workflows",
        description: String(err),
        variant: "destructive",
      });
    } finally {
      setCustomLoading(false);
    }
  }, []);

  // fetch recent runs (optional)
  const loadRuns = useCallback(async () => {
    setRunsLoading(true);
    try {
      // Using api service for history if it matches, otherwise keeping raw for now or adding to api.ts
      // The prompt specified getHistory for data/history. 
      // For workflows/runs, I should probably add to api.ts or keep raw.
      // Let's keep raw for non-standard endpoints not in the quickstart, 
      // but save/dryRun ARE in quickstart.
      const res = await fetch(`${API_BASE}/workflows/runs?limit=10`, {
        method: "GET",
        credentials: "include",
      });
      if (!res.ok) throw new Error(`Runs fetch failed (${res.status})`);
      const json = await res.json();
      setWorkflowRuns(Array.isArray(json.runs) ? json.runs : []);
    } catch (err) {
      console.error("Failed to load runs:", err);
      toast({
        title: "Failed to load runs",
        description: String(err),
        variant: "destructive",
      });
    } finally {
      setRunsLoading(false);
    }
  }, []);

  // save workflow
  const saveWorkflow = useCallback(async () => {
    setIsSaving(true);
    try {
      // client-side validation first
      const issues = validateWorkflow(nodes, edges);
      setValidationIssues(issues);
      const errorsOnly = issues.filter((i) => i.type === "error");
      if (errorsOnly.length > 0) {
        setShowValidation(true);
        toast({
          title: "Validation errors",
          description: `Found ${errorsOnly.length} error(s). Please fix them.`,
          variant: "destructive",
        });
        return;
      }

      const payload = { name: workflowName, enabled: isEnabled, nodes, edges };

      // Use api service
      const res = await api.saveWorkflow(payload);

      toast({
        title: "Workflow saved",
        description: "Saved successfully",
      });

      // If backend returns the saved workflow, we might want to store it
      // but api.saveWorkflow in the quickstart returns a Promise<AxiosResponse>
      // The quickstart didn't specify return type generic for saveWorkflow, assuming any.
      const saved = res.data?.workflow;
      if (saved) {
        try {
          localStorage.setItem("sv_workflow", JSON.stringify(saved));
        } catch { }
      }

    } catch (err: any) {
      console.error("Save error:", err);
      toast({
        title: "Save failed",
        description: err.response?.data?.error || String(err),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [workflowName, isEnabled, nodes, edges]);

  // dry-run: send to backend to simulate
  const runDryRun = useCallback(async () => {
    setIsDryRunning(true);
    try {
      const issues = validateWorkflow(nodes, edges);
      const errorsOnly = issues.filter((i) => i.type === "error");
      if (errorsOnly.length > 0) {
        setValidationIssues(issues);
        setShowValidation(true);
        toast({
          title: "Cannot run",
          description: "Fix validation errors first",
          variant: "destructive",
        });
        setIsDryRunning(false);
        return;
      }

      const payload = { nodes, edges, name: workflowName, enabled: false };

      // Use api service
      const res = await api.dryRunWorkflow(payload);
      const json = res.data;

      const run =
        json.run ?? {
          id: `run-${Date.now()}`,
          status: "success",
          result: json.result ?? {},
        };
      setWorkflowRuns((prev) => [run, ...prev]);
      toast({
        title: "Dry run complete",
        description: json.message || "Simulation finished",
      });
    } catch (err: any) {
      console.error("Dry-run error:", err);
      toast({
        title: "Dry run failed",
        description: err.response?.data?.error || String(err),
        variant: "destructive",
      });
    } finally {
      setIsDryRunning(false);
    }
  }, [nodes, edges, workflowName]);

  // apply server template object to canvas
  const applyTemplate = useCallback(
    (template: WorkflowTemplate) => {
      setNodes(template.nodes);
      setEdges(template.edges);
      setWorkflowName(template.name);
      setSelectedNode(null);
      toast({
        title: "Template applied",
        description: `Loaded: ${template.name}`,
      });
      setShowTemplates(false);
    },
    [setNodes, setEdges]
  );

  // validate current workflow (client-only)
  const validateCurrentWorkflow = useCallback(() => {
    const issues = validateWorkflow(nodes, edges);
    setValidationIssues(issues);
    setShowValidation(true);
    if (issues.length === 0) {
      toast({
        title: "Validation passed",
        description: "No issues found in workflow",
      });
    } else {
      const errors = issues.filter((i) => i.type === "error").length;
      const warnings = issues.filter((i) => i.type === "warning").length;
      toast({
        title: "Validation complete",
        description: `Found ${errors} error(s) and ${warnings} warning(s)`,
        variant: errors > 0 ? "destructive" : "default",
      });
    }
  }, [nodes, edges]);

  // load templates when modal opens
  useEffect(() => {
    if (showTemplates) loadTemplates();
  }, [showTemplates, loadTemplates]);

  // load custom workflows when modal opens
  useEffect(() => {
    if (showCustomWorkflows) loadCustomWorkflows();
  }, [showCustomWorkflows, loadCustomWorkflows]);

  // load runs when component mounts
  useEffect(() => {
    loadRuns();
  }, [loadRuns]);

  // Keep refs up to date
  useEffect(() => {
    saveWorkflowRef.current = saveWorkflow;
    deleteNodeRef.current = deleteNode;
  }, [saveWorkflow, deleteNode]);

  // Assistant helpers (side drawer in this page – separate from FAB)
  const addNodeFromSuggestion = (suggestion: any) => {
    const id = `${suggestion.nodeType}-${Date.now()}`;
    const position =
      suggestion.position ?? {
        x: 300 + Math.random() * 200,
        y: 200 + Math.random() * 120,
      };
    const newNode: Node = {
      id,
      type: "workflow",
      position,
      data: {
        label: suggestion.label ?? `${suggestion.nodeType}`,
        nodeType: suggestion.nodeType,
        config: suggestion.config ?? {},
        status: "idle",
      },
    };
    setNodes((nds) => nds.concat(newNode));
    toast({
      title: "Assistant applied suggestion",
      description: `Added ${suggestion.label || suggestion.nodeType}`,
    });
  };

  const handleAssistantResponse = (userText: string) => {
    setAssistantThinking(true);
    const uid = `m-${Date.now()}`;
    setChatMessages((m) =>
      m.concat({ id: uid, sender: "user", text: userText })
    );

    setTimeout(() => {
      let assistantText = "I can help with that. Here are some suggestions:";
      let suggestion: any = null;

      if (/increase budget|budget increase|increase budget/i.test(userText)) {
        assistantText +=
          " Add an 'Action' node to increase budget by 20% for winners.";
        suggestion = {
          nodeType: "action",
          label: "Increase Budget (20%)",
          config: { action: "increase_budget", byPercent: 20 },
        };
      } else if (/pause|stop low performer/i.test(userText)) {
        assistantText +=
          " Add a 'Condition' node that checks CPA and an 'Action' node to pause campaigns.";
        suggestion = {
          nodeType: "condition",
          label: "Pause Low Performers Check",
          config: { metric: "CPA", threshold: 50 },
        };
      } else if (/set schedule|schedule/i.test(userText)) {
        assistantText += " Update the trigger's schedule to run daily at 3 AM.";
        suggestion = {
          nodeType: "trigger",
          label: "Daily Trigger (3 AM)",
          config: { schedule: "0 3 * * *" },
        };
      } else {
        assistantText +=
          " I can add nodes, set schedules, or suggest validations. Try saying 'add condition to check CPA > 50'.";
      }

      const assistantId = `m-${Date.now() + 1}`;
      setChatMessages((m) =>
        m.concat({
          id: assistantId,
          sender: "assistant",
          text: assistantText,
          suggestion,
        })
      );
      setAssistantThinking(false);
    }, 700 + Math.random() * 600);
  };

  const handleChatSend = () => {
    const text = chatInput.trim();
    if (!text) return;
    handleAssistantResponse(text);
    setChatInput("");
  };

  // UI helpers
  const nodeColor = useCallback(
    (node: Node) =>
      nodeColorMap[node.data.nodeType as keyof typeof nodeColorMap] ||
      "#6b7280",
    []
  );

  // apply custom workflow (server-side custom)
  const applyCustomWorkflow = (cw: WorkflowTemplate) => {
    setNodes(cw.nodes);
    setEdges(cw.edges);
    setWorkflowName(cw.name);
    setShowCustomWorkflows(false);
    toast({ title: "Custom workflow applied", description: cw.name });
  };

  // 🔥 When AI inside FloatingAssistant chooses a predefined workflow template
  const handleAssistantWorkflowTemplate = useCallback(
    (templateId: string) => {
      const template = workflowTemplates.find((t) => t.id === templateId);
      if (!template) {
        toast({
          title: "Unknown workflow template",
          description: `Template id: ${templateId}`,
          variant: "destructive",
        });
        return;
      }

      setNodes(template.nodes);
      setEdges(template.edges);
      setWorkflowName(template.name);
      setSelectedNode(null);

      toast({
        title: "Workflow created by Sociovia AI",
        description: `Loaded: ${template.name}`,
      });
    },
    [setNodes, setEdges]
  );

  // 🔥 When AI returns a full workflow JSON (nodes + edges) instead of templateId
  const handleAssistantWorkflowJson = useCallback(
    (wf: AssistantWorkflowPayload) => {
      try {
        // Trust backend to send valid Node/Edge shapes for ReactFlow
        setNodes(wf.nodes as Node[]);
        setEdges(wf.edges as Edge[]);
        setWorkflowName(wf.name || "AI-generated workflow");
        setSelectedNode(null);

        toast({
          title: "Workflow created from AI",
          description: wf.name || "Loaded workflow from assistant",
        });
      } catch (err) {
        console.error("Failed to apply AI workflow JSON", err);
        toast({
          title: "Failed to load workflow",
          description: "The workflow returned by AI could not be loaded.",
          variant: "destructive",
        });
      }
    },
    [setNodes, setEdges]
  );

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-background via-background to-primary/5">
      {/* Top Toolbar */}
      <motion.div
        className="border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80"
        initial={{ y: -50 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex flex-col sm:flex-row items-center justify-between px-4 sm:px-6 py-3 gap-2">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                <Workflow className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <Input
                  value={workflowName}
                  onChange={(e) => setWorkflowName(e.target.value)}
                  className="font-semibold text-lg border-0 bg-transparent px-0 focus-visible:ring-0"
                  placeholder="Workflow Name"
                />
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{nodes.length} nodes</span>
                  <span>•</span>
                  <span>{edges.length} connections</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 justify-end w-full sm:w-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCustomWorkflows(true)}
              className="flex-shrink-0"
            >
              <List className="w-4 h-4 mr-2" /> Custom Workflows
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTemplates(!showTemplates)}
              className="flex-shrink-0"
            >
              <Copy className="w-4 h-4 mr-2" /> Templates
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAssistant((s) => !s)}
            >
              <MessageSquare className="w-4 h-4 mr-2" /> Assistant
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={validateCurrentWorkflow}
              className="flex-shrink-0"
            >
              <CheckCircle className="w-4 h-4 mr-2" /> Validate
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={runDryRun}
              disabled={isDryRunning}
              className="flex-shrink-0"
            >
              {isDryRunning ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}{" "}
              {isDryRunning ? "Running..." : "Dry Run"}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={saveWorkflow}
              disabled={isSaving}
              className="flex-shrink-0"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}{" "}
              {isSaving ? "Saving..." : "Save"}
            </Button>

            <div className="flex items-center gap-2 border-l pl-2 ml-2 flex-shrink-0">
              <Label htmlFor="enabled" className="text-sm whitespace-nowrap">
                Enabled
              </Label>
              <input
                id="enabled"
                type="checkbox"
                checked={isEnabled}
                onChange={(e) => setIsEnabled(e.target.checked)}
                className="w-4 h-4 rounded"
                aria-label="Enable workflow"
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">
        <div className="hidden md:flex border-r h-full">
          <NodePalette />
        </div>

        <div className="flex-1 relative min-h-0">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            fitView
            className="bg-muted/20 transition-all duration-300"
          >
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
            <Controls showInteractive />
            <MiniMap
              nodeColor={nodeColor}
              maskColor="rgba(0, 0, 0, 0.1)"
              nodeStrokeWidth={3}
            />
            <Panel
              position="top-right"
              className="bg-card border rounded-lg shadow-lg p-3 m-4"
            >
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-xs">Trigger</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <span className="text-xs">Condition</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-xs">Action</span>
                </div>
              </div>
            </Panel>
          </ReactFlow>
        </div>

        <div className="hidden lg:flex border-l h-full">
          <InspectorPanel
            selectedNode={selectedNode}
            onUpdateNode={updateNodeData}
            onDeleteNode={deleteNode}
            onDuplicateNode={duplicateNode}
          />
        </div>
      </div>

      {/* Custom Workflows modal */}
      <AnimatePresence>
        {showCustomWorkflows && (
          <motion.div
            className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 overflow-y-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-3xl my-8 flex flex-col max-h-[90vh] overflow-hidden"
              initial={{ scale: 0.98, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.98, y: 12 }}
            >
              <Card className="flex flex-col h-full">
                <CardHeader className="border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Custom Workflows</CardTitle>
                      <CardDescription>Workflows you created</CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowCustomWorkflows(false)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <ScrollArea className="flex-1">
                  <CardContent className="p-6 grid grid-cols-1 gap-4">
                    {customLoading ? (
                      <div className="text-sm">Loading...</div>
                    ) : (
                      customWorkflows.map((cw) => (
                        <div
                          key={cw.id}
                          className="p-4 border rounded-md flex items-center justify-between"
                        >
                          <div>
                            <div className="font-semibold">{cw.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {cw.description}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setNodes(cw.nodes);
                                setEdges(cw.edges);
                                setWorkflowName(cw.name);
                                toast({
                                  title: "Preview applied",
                                  description: cw.name,
                                });
                              }}
                            >
                              Preview
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => applyCustomWorkflow(cw)}
                            >
                              Apply
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                    {!customLoading && customWorkflows.length === 0 && (
                      <div className="text-xs text-muted-foreground">
                        No custom workflows yet.
                      </div>
                    )}
                  </CardContent>
                </ScrollArea>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Assistant Drawer (builder-local assistant) */}
      <AnimatePresence>
        {showAssistant && (
          <motion.aside
            className="fixed right-6 top-16 bottom-6 w-96 z-50 bg-card border rounded-lg shadow-xl flex flex-col overflow-hidden"
            initial={{ x: 400 }}
            animate={{ x: 0 }}
            exit={{ x: 400 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            <div className="flex items-center justify-between p-3 border-b">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                <div>
                  <div className="font-semibold">Workflow Assistant</div>
                  <div className="text-xs text-muted-foreground">
                    Ask the assistant to automate steps
                  </div>
                </div>
              </div>
              <div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setChatMessages([]);
                    setShowAssistant(false);
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {chatMessages.length === 0 && !assistantThinking && (
                <div className="text-sm text-muted-foreground">
                  Try: {"Add condition to check CPA > 50"}
                </div>
              )}

              {chatMessages.map((m) => (
                <div
                  key={m.id}
                  className={
                    "flex " +
                    (m.sender === "user" ? "justify-end" : "justify-start")
                  }
                >
                  <div
                    className={
                      "max-w-[80%] p-3 rounded-lg " +
                      (m.sender === "user"
                        ? "bg-primary/10 text-primary-foreground"
                        : "bg-card/50 text-muted-foreground")
                    }
                  >
                    <div className="text-sm">{m.text}</div>

                    {m.sender === "assistant" && m.suggestion && (
                      <div className="mt-2 flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => addNodeFromSuggestion(m.suggestion)}
                        >
                          Apply suggestion
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            toast({
                              title: "Saved suggestion",
                              description: "You can apply this later.",
                            })
                          }
                        >
                          Save suggestion
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {assistantThinking && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="animate-spin w-4 h-4" /> Thinking...
                </div>
              )}
            </div>

            <div className="p-3 border-t">
              <div className="flex gap-2 items-center">
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask the assistant (e.g., 'add condition to check CPA > 50')"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleChatSend();
                  }}
                />
                <Button onClick={handleChatSend} disabled={assistantThinking}>
                  Send
                </Button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Templates Modal */}
      <AnimatePresence>
        {showTemplates && (
          <motion.div
            className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 overflow-y-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-4xl my-8 flex flex-col max-h-[90vh] overflow-hidden"
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              <Card className="flex flex-col h-full">
                <CardHeader className="border-b flex-shrink-0 sticky top-0 bg-card z-10">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-primary" />
                        Workflow Templates
                      </CardTitle>
                      <CardDescription>
                        Start with a pre-built workflow template
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowTemplates(false)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>

                <ScrollArea className="flex-1">
                  <CardContent className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
                    {templatesLoading ? (
                      <div className="text-sm">Loading templates...</div>
                    ) : (
                      templates.map((t) => (
                        <div
                          key={t.id}
                          className="p-4 border rounded-md mb-3 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <t.icon
                              className={`${t.color} w-5 h-5 flex-shrink-0`}
                            />
                            <div>
                              <div className="font-semibold">{t.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {t.description}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setNodes(t.nodes);
                                setEdges(t.edges);
                                setWorkflowName(`${t.name} (preview)`);
                              }}
                            >
                              Preview
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => applyTemplate(t)}
                            >
                              Apply
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                    {!templatesLoading && templates.length === 0 && (
                      <div className="text-xs text-muted-foreground">
                        No templates available.
                      </div>
                    )}
                  </CardContent>
                </ScrollArea>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Validation modal */}
      <AnimatePresence>
        {showValidation && (
          <motion.div
            className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-2xl max-h-[80vh] overflow-hidden"
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              <Card>
                <CardHeader className="border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Validation Results</CardTitle>
                      <CardDescription>
                        {validationIssues.length === 0
                          ? "No issues found"
                          : `Found ${validationIssues.filter(
                            (i) => i.type === "error"
                          ).length
                          } errors and ${validationIssues.filter(
                            (i) => i.type === "warning"
                          ).length
                          } warnings`}
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowValidation(false)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <ScrollArea className="max-h-[60vh]">
                  <CardContent className="p-6 space-y-3">
                    {validationIssues.length === 0 ? (
                      <div className="text-center py-8">
                        <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                        <p className="text-lg font-semibold">All Good!</p>
                        <p className="text-muted-foreground">
                          Your workflow has no issues
                        </p>
                      </div>
                    ) : (
                      validationIssues.map((issue, i) => (
                        <motion.div
                          key={issue.id}
                          className={`p-4 rounded-lg border-2 ${issue.type === "error"
                            ? "border-red-500 bg-red-50"
                            : "border-amber-500 bg-amber-50"
                            }`}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                        >
                          <div className="flex items-start gap-3">
                            <AlertCircle
                              className={`w-5 h-5 ${issue.type === "error"
                                ? "text-red-600"
                                : "text-amber-600"
                                } flex-shrink-0 mt-0.5`}
                            />
                            <div className="flex-1">
                              <div className="font-semibold capitalize mb-1">
                                {issue.type}
                              </div>
                              <div className="text-sm">{issue.message}</div>
                              {issue.nodeId && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  Node ID: {issue.nodeId}
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </CardContent>
                </ScrollArea>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Runs Panel */}
      <AnimatePresence>
        {workflowRuns.length > 0 && (
          <motion.div
            className="fixed bottom-4 left-4 z-40"
            initial={{ x: -400 }}
            animate={{ x: 0 }}
            exit={{ x: -400 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            <Card className="w-96 shadow-xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Recent Runs</CardTitle>
              </CardHeader>
              <CardContent className="pb-3 max-h-64 overflow-y-auto">
                <WorkflowRunsTable
                  runs={workflowRuns.slice(0, 5)}
                  onViewRun={(runId) => {
                    toast({
                      title: "Run details",
                      description: `Viewing run ${runId}`,
                    });
                  }}
                />
              </CardContent>
              <Button
                variant="ghost"
                size="sm"
                className="border-t mx-3 mt-2"
                onClick={() => setWorkflowRuns([])}
              >
                <X className="w-4 h-4 mr-2" /> Dismiss
              </Button>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🔥 Global Sociovia AI Assistant FAB (connected to workflows) */}
      {workspaceId && (
        <FloatingAssistant
          userId={storedUser.userId ?? storedUser.id}
          workspaceId={workspaceId}
          // API_BASE has /api, assistant expects base without it
          apiBaseUrl={API_BASE.replace(/\/api$/, "")}
          onWorkflowTemplateSelected={handleAssistantWorkflowTemplate}
          onWorkflowJsonReceived={handleAssistantWorkflowJson}
        />
      )}
    </div>
  );
}
