// src/pages/Assistant.tsx
import React, { useEffect, useRef, useState } from "react";
import {
  X,
  Maximize2,
  Minimize2,
  Send,
  Sparkles,
  BarChart2,
  Paperclip,
  ArrowUpRight,
  Calendar as CalendarIcon,
  Check,
  XCircle,
  MessageCircle,
  CheckSquare,
  Bell,
  HelpCircle,
  Clock,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// -------- Types for Agentic Stuff --------

export type AssistantAction = {
  id: string;
  label: string;
  variant?: "primary" | "secondary" | "destructive";
  api?: string; // optional custom endpoint; falls back to /api/assistant/action
  payload?: any;
};

export type ChatMessage = {
  id: string;
  from: "user" | "bot" | "system";
  text: string;
  time: number;
  type?: "text" | "chart" | "kpi" | "actions" | "calendar" | "workflow" | "navigation";
  data?: any;
  actions?: AssistantAction[];
};


export type Task = {
  id: string;
  title: string;
  description?: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  priority?: "low" | "medium" | "high" | "urgent";
  dueDate?: string;
  createdAt: string;
  updatedAt?: string;
  assignedTo?: string;
};

export type CalendarEvent = {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime?: string;
  type?: "meeting" | "deadline" | "campaign" | "reminder" | "other";
  status?: "scheduled" | "completed" | "cancelled";
};

export type Notification = {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  timestamp: string;
  read: boolean;
  actionUrl?: string;
};

// 🔥 Workflow payload type coming from backend (for direct JSON workflows)
export type AssistantWorkflowPayload = {
  id?: string;
  name: string;
  nodes: any[];
  edges: any[];
};

type WindowState = {
  isOpen: boolean;
  isMaximized: boolean;
  w: number;
  h: number;
};

const STORAGE_KEY = "assistant_fab_state_v1";

const DEFAULT_W = 380;
const DEFAULT_H = 600;

type TabId = "chat" | "tasks" | "calendar" | "notifications" | "support";

type FloatingAssistantProps = {
  userId?: number | string;
  workspaceId?: number | string;
  apiBaseUrl?: string;
  className?: string;

  // Canvas integration callbacks
  onWorkflowTemplateSelected?: (templateId: string) => void;
  onWorkflowJsonReceived?: (workflow: AssistantWorkflowPayload) => void;
};

// Import config at the top of the component to use as default
import { API_BASE_URL } from "@/config";

export default function FloatingAssistant({
  userId: propUserId,
  workspaceId: propWorkspaceId,
  apiBaseUrl = API_BASE_URL,
  className = "",
  onWorkflowTemplateSelected,
  onWorkflowJsonReceived,
}: FloatingAssistantProps) {
  // Fallback to localStorage/sessionStorage if props not provided
  const userId = propUserId || localStorage.getItem('sociovia_user_id') || sessionStorage.getItem('sociovia_user_id') || '';
  const workspaceId = propWorkspaceId || localStorage.getItem('sv_whatsapp_workspace_id') || sessionStorage.getItem('sv_whatsapp_workspace_id') || '';
  const rootRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const navigate = useNavigate(); // 👈 ADD THIS


  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [runningActionId, setRunningActionId] = useState<string | null>(null);

  // --- Threaded Conversation State ---
  const MAX_HISTORY_MSGS = 12;
  const CONVO_STORAGE_KEY = `assistant_conversation_${userId}_${workspaceId}`;

  const [conversationId, setConversationId] = useState<number | null>(() => {
    try {
      const raw = localStorage.getItem(CONVO_STORAGE_KEY);
      return raw ? Number(raw) : null;
    } catch {
      return null;
    }
  });

  const [loadingConversation, setLoadingConversation] = useState(false);

  // Load existing conversation (if possible)
  useEffect(() => {
    const loadConversation = async () => {
      if (!conversationId || !userId || !workspaceId) return;
      setLoadingConversation(true);
      try {
        const res = await fetch(
          `${apiBaseUrl}/api/assistant/conversations/${conversationId}/messages?userId=${userId}&workspaceId=${workspaceId}`,
          { credentials: "include" }
        );
        if (!res.ok) {
          // endpoint might not exist yet; ignore quietly
          setLoadingConversation(false);
          return;
        }
        const data = await res.json();
        if (Array.isArray(data.messages)) {
          setMessages(data.messages);
        }
      } catch (e) {
        console.warn("Could not load conversation messages:", e);
      } finally {
        setLoadingConversation(false);
      }
    };

    void loadConversation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  // Agentic tabs state
  const [activeTab, setActiveTab] = useState<TabId>("chat");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  // Initialize window state
  const [winState, setWinState] = useState<WindowState>(() => {
    if (typeof window === "undefined")
      return {
        isOpen: false,
        isMaximized: false,
        w: DEFAULT_W,
        h: DEFAULT_H,
      };
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          isOpen: false, // start minimized
          isMaximized: parsed.isMaximized ?? false,
          w: parsed.w ?? DEFAULT_W,
          h: parsed.h ?? DEFAULT_H,
        };
      }
    } catch { }
    return {
      isOpen: false,
      isMaximized: false,
      w: DEFAULT_W,
      h: DEFAULT_H,
    };
  });

  // Persist window state
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(winState));
    } catch { }
  }, [winState]);

  // Auto-scroll on new messages (chat tab only)
  useEffect(() => {
    if (scrollRef.current && winState.isOpen && activeTab === "chat") {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, winState.isOpen, activeTab]);

  // --- Dragging Logic Removed ---
  // The user requested to keep the assistant fixed at the bottom right.


  // --- Fetch Tasks ---
  const fetchTasks = async () => {
    if (!userId || !workspaceId) return;
    setLoadingTasks(true);
    try {
      const res = await fetch(
        `${apiBaseUrl}/api/assistant/tasks?userId=${userId}&workspaceId=${workspaceId}`,
        { credentials: "include" }
      );
      const data = await res.json();
      if (res.ok && Array.isArray(data.tasks)) {
        setTasks(data.tasks);
      }
    } catch (e) {
      console.error("Failed to load tasks", e);
    } finally {
      setLoadingTasks(false);
    }
  };

  // --- Fetch Calendar Events ---
  const fetchCalendarEvents = async () => {
    if (!userId || !workspaceId) return;
    setLoadingEvents(true);
    try {
      const res = await fetch(
        `${apiBaseUrl}/api/assistant/calendar?userId=${userId}&workspaceId=${workspaceId}`,
        { credentials: "include" }
      );
      const data = await res.json();
      if (res.ok && Array.isArray(data.events)) {
        setCalendarEvents(data.events);
      }
    } catch (e) {
      console.error("Failed to load calendar", e);
    } finally {
      setLoadingEvents(false);
    }
  };

  // --- Fetch Notifications ---
  const fetchNotifications = async () => {
    if (!userId || !workspaceId) return;
    setLoadingNotifications(true);
    try {
      const res = await fetch(
        `${apiBaseUrl}/api/assistant/notifications?userId=${userId}&workspaceId=${workspaceId}`,
        { credentials: "include" }
      );
      const data = await res.json();
      if (res.ok && Array.isArray(data.notifications)) {
        setNotifications(data.notifications);
      }
    } catch (e) {
      console.error("Failed to load notifications", e);
    } finally {
      setLoadingNotifications(false);
    }
  };

  // Auto-fetch data when tabs are activated
  useEffect(() => {
    if (!winState.isOpen) return;
    if (activeTab === "tasks" && tasks.length === 0) fetchTasks();
    if (activeTab === "calendar" && calendarEvents.length === 0)
      fetchCalendarEvents();
    if (activeTab === "notifications" && notifications.length === 0)
      fetchNotifications();
  }, [activeTab, winState.isOpen]);

  // --- Streaming helper (fake stream / typewriter) ---
  const streamInMessage = (fullText: string, messageId: string) => {
    let index = 0;
    const chunkSize = 3;
    const interval = 15;

    const timer = setInterval(() => {
      index += chunkSize;
      if (index >= fullText.length) {
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, text: fullText } : m))
        );
        clearInterval(timer);
        return;
      }

      const partial = fullText.slice(0, index);
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, text: partial } : m))
      );
    }, interval);
  };

  // --- Send chat to backend ---
  const sendToBackend = async (text: string) => {
    if (userId == null || workspaceId == null) {
      setError("Assistant not ready: missing user or workspace context.");
      setMessages((prev) => [
        ...prev,
        {
          id: `system-${Date.now()}`,
          from: "system",
          text:
            "I don't know which user/workspace this is yet. Please ensure dashboard has user + workspace loaded.",
          time: Date.now(),
          type: "text",
        },
      ]);
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      from: "user",
      text,
      time: Date.now(),
      type: "text",
    };

    const history: ChatMessage[] = [...messages, userMessage];
    setMessages(history);
    setIsTyping(true);
    setError(null);

    // Take only the last MAX_HISTORY_MSGS messages for backend
    const sliceStart = Math.max(0, history.length - MAX_HISTORY_MSGS);
    const recentSlice = history.slice(sliceStart);

    const messagesForBackend = recentSlice.map((m) => ({
      from: m.from,
      text: m.text,
    }));

    const payload = {
      userId,
      workspaceId,
      conversationId,          // may be null on first call
      messages: messagesForBackend,
    };

    try {
      console.log("[Assistant] Sending payload:", payload);

      const res = await fetch(`${apiBaseUrl}/api/assistant/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      console.log("[Assistant] Response:", data);

      if (!res.ok) {
        throw new Error(data?.error || "Assistant error");
      }

      // NEW: store conversationId from backend
      if (data.conversationId) {
        const cid = Number(data.conversationId);
        setConversationId(cid);
        try {
          localStorage.setItem(CONVO_STORAGE_KEY, String(cid));
        } catch { }
      }

      const reply = data.message as ChatMessage | undefined;
      if (!reply) {
        throw new Error("Invalid response from assistant");
      }

      const botId = reply.id || `bot-${Date.now()}`;
      const initialBotMessage: ChatMessage = {
        ...reply,
        id: botId,
        text: "", // start empty; stream in
      };

      // 🔥 Workflow integration: detect workflow suggestion in the reply
      if (reply.type === "workflow" && reply.data) {
        const d: any = reply.data;

        // Case 1: full workflow JSON (nodes + edges)
        if (d.workflow && onWorkflowJsonReceived) {
          const wf = d.workflow;
          const payload: AssistantWorkflowPayload = {
            id: wf.id,
            name: wf.name || d.templateName || "AI Suggested Workflow",
            nodes: wf.nodes || [],
            edges: wf.edges || [],
          };
          try {
            onWorkflowJsonReceived(payload);
          } catch (err) {
            console.error(
              "Failed to apply workflow JSON from assistant",
              err
            );
          }
        }
        // Case 2: template id only
        else if (d.templateId && onWorkflowTemplateSelected) {
          try {
            onWorkflowTemplateSelected(String(d.templateId));
          } catch (err) {
            console.error(
              "Failed to apply workflow templateId from assistant",
              err
            );
          }
        }
      }

      setMessages((prev) => [...prev, initialBotMessage]);

      if (reply.text) {
        streamInMessage(reply.text, botId);
      }
    } catch (e: any) {
      console.error("Assistant error", e);
      setError(e?.message || "Something went wrong while talking to the AI.");
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          from: "system",
          text:
            "Oops, I couldn't reach the assistant backend. Please try again in a moment.",
          time: Date.now(),
          type: "text",
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = () => {
    if (!input.trim()) return;
    const text = input.trim();
    setInput("");
    void sendToBackend(text);
  };

  const toggleMaximize = () => {
    setWinState((s) => ({
      ...s,
      isMaximized: !s.isMaximized,
    }));
  };

  const handleActionClick = async (msg: ChatMessage, action: AssistantAction) => {
    if (runningActionId) return;

    // 🔥 If user clicks "Open in workflow builder", immediately push the workflow to canvas
    if (action.id.startsWith("open_workflow_builder::") && msg.data) {
      const d: any = msg.data;
      if (d.workflow && onWorkflowJsonReceived) {
        const wf = d.workflow;
        const payload: AssistantWorkflowPayload = {
          id: wf.id,
          name: wf.name || d.templateName || "AI Suggested Workflow",
          nodes: wf.nodes || [],
          edges: wf.edges || [],
        };
        try {
          onWorkflowJsonReceived(payload);
        } catch (err) {
          console.error(
            "Failed to apply workflow JSON from assistant (open builder)",
            err
          );
        }
      } else if (d.templateId && onWorkflowTemplateSelected) {
        try {
          onWorkflowTemplateSelected(String(d.templateId));
        } catch (err) {
          console.error(
            "Failed to apply workflow templateId from assistant (open builder)",
            err
          );
        }
      }
    }

    if (userId == null || workspaceId == null) {
      setError("Assistant not ready: missing user or workspace context.");
      return;
    }

    setRunningActionId(action.id);

    setMessages((prev) => [
      ...prev,
      {
        id: `system-action-${Date.now()}`,
        from: "system",
        text: `Executing: ${action.label}…`,
        time: Date.now(),
        type: "text",
      },
    ]);

    try {
      const endpoint = action.api || `${apiBaseUrl}/api/assistant/action`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          workspaceId,
          conversationId,        // <-- add this
          actionId: action.id,
          sourceMessageId: msg.id,
          payload: action.payload || {},
        }),
      });

      const data = await res.json();
      console.log("[Assistant] Action response:", data);

      if (!res.ok) {
        throw new Error(data?.error || "Action failed");
      }

      if (data.message) {
        const reply = data.message as ChatMessage;
        setMessages((prev) => [...prev, reply]);

        // 🔥 Handle backend-driven navigation (e.g. navigate::sociovia-ai)
        const replyAny = reply as any;
        const isNavigation = replyAny?.type === "navigation";
        const navigateTarget = replyAny?.data?.navigate;

        if (
          isNavigation &&
          typeof navigateTarget === "string" &&
          navigateTarget.trim()
        ) {
          try {
            if (
              navigateTarget.startsWith("http://") ||
              navigateTarget.startsWith("https://")
            ) {
              // external link
              window.location.href = navigateTarget;
              window.location.href = navigateTarget;
            } else {
              // internal SPA route
              let target = navigateTarget;
              // Normalize legacy routes to /crm/ prefixes if needed
              const crmPaths = ["/dashboard", "/campaigns", "/leads", "/deals", "/contacts", "/tasks", "/settings"];
              for (const p of crmPaths) {
                // Check if target matches legacy path (e.g. "/leads" or "/leads/123")
                if (target === p || target.startsWith(p + "/")) {
                  target = `/crm${target}`;
                  break;
                }
              }
              navigate(target);
            }
          } catch (err) {
            console.error("Navigation from assistant failed", err);
          }
        }
      } else if (data.status || data.result) {
        setMessages((prev) => [
          ...prev,
          {
            id: `action-result-${Date.now()}`,
            from: "bot",
            text:
              data.result ||
              `Action "${action.label}" completed successfully.`,
            time: Date.now(),
            type: "text",
          },
        ]);
      }
    } catch (e: any) {
      console.error("Assistant action error", e);
      setError(e?.message || "Action failed.");
      setMessages((prev) => [
        ...prev,
        {
          id: `action-error-${Date.now()}`,
          from: "system",
          text:
            "Something went wrong while executing this action. Please try again.",
          time: Date.now(),
          type: "text",
        },
      ]);
    } finally {
      setRunningActionId(null);
    }
  };

  // ---------- Visual Renderers (KPI / Chart / Calendar / Actions) ----------

  const renderKpiGrid = (data: any) => {
    const metrics =
      data?.metrics ||
      data?.kpis || [
        { label: "Leads", value: 0, trend: "—", trendDirection: "flat" },
      ];

    return (
      <div className="mt-3 grid grid-cols-2 gap-2">
        {metrics.map((m: any, idx: number) => {
          const trendDir = m.trendDirection || "flat";
          const isUp = trendDir === "up";
          const isDown = trendDir === "down";
          const trendColor = isUp
            ? "text-emerald-500"
            : isDown
              ? "text-red-500"
              : "text-slate-400";

          return (
            <div
              key={idx}
              className="rounded-xl border border-white/40 bg-white/70 px-3 py-2 shadow-sm flex flex-col gap-1"
            >
              <div className="text-[11px] text-slate-500">{m.label}</div>
              <div className="text-sm font-semibold text-slate-900">
                {m.value}
              </div>
              {m.trend && (
                <div
                  className={cn(
                    "text-[10px] flex items-center gap-1",
                    trendColor
                  )}
                >
                  <span>{isUp ? "▲" : isDown ? "▼" : "•"}</span>
                  <span>{m.trend}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderAnalyticsChart = (data: any) => {
    const points = data?.points || data || [];
    const chartType = data?.chartType || "line";

    return (
      <div className="w-full h-48 mt-3 bg-white/50 rounded-lg p-2 border border-white/20">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === "bar" ? (
            <BarChart data={points}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" hide />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: "none",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                }}
              />
              <Bar dataKey="value" />
            </BarChart>
          ) : (
            <LineChart data={points}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" hide />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: "none",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                }}
              />
              <Line type="monotone" dataKey="value" dot={false} />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    );
  };

  const renderCalendarView = (data: any) => {
    const events: any[] = data?.events || [];
    if (!events.length) {
      return (
        <div className="mt-3 text-[11px] text-slate-400">
          No upcoming events in your calendar yet.
        </div>
      );
    }

    return (
      <div className="mt-3 space-y-2">
        {events.map((ev, idx) => (
          <div
            key={idx}
            className="flex items-start gap-2 rounded-xl border border-white/40 bg-white/70 px-3 py-2 shadow-sm"
          >
            <div className="mt-0.5">
              <CalendarIcon className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="flex-1">
              <div className="text-[12px] font-semibold text-slate-800">
                {ev.title}
              </div>
              <div className="text-[11px] text-slate-500">
                {ev.timeText || ev.time || ""}
              </div>
              {ev.description && (
                <div className="mt-1 text-[11px] text-slate-600">
                  {ev.description}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderActionsRow = (msg: ChatMessage) => {
    const actions = msg.actions || [];
    if (!actions.length) return null;

    return (
      <div className="mt-3 flex flex-wrap gap-2">
        {actions.map((action) => {
          const variant = action.variant || "secondary";
          let btnClass =
            "text-[11px] h-7 px-3 rounded-full border transition-colors flex items-center gap-1";
          if (variant === "primary") {
            btnClass +=
              " bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700";
          } else if (variant === "destructive") {
            btnClass +=
              " bg-red-50 text-red-600 border-red-200 hover:bg-red-100";
          } else {
            btnClass +=
              " bg-white/70 text-slate-700 border-slate-200 hover:bg-slate-50";
          }

          const Icon =
            variant === "primary"
              ? Check
              : variant === "destructive"
                ? XCircle
                : ArrowUpRight;

          const isLoading = runningActionId === action.id;

          return (
            <button
              key={action.id}
              disabled={isLoading}
              onClick={() => void handleActionClick(msg, action)}
              className={cn(btnClass, isLoading && "opacity-70 cursor-wait")}
            >
              <Icon className="w-3 h-3" />
              <span>{isLoading ? "Working..." : action.label}</span>
            </button>
          );
        })}
      </div>
    );
  };

  // --- Chat message renderer ---
  const renderMessage = (msg: ChatMessage) => {
    const isUser = msg.from === "user";
    const bubbleClasses = cn(
      "max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm backdrop-blur-sm",
      isUser
        ? "bg-gradient-to-br from-indigo-600 to-violet-600 text-white rounded-tr-none"
        : "bg-white/80 border border-white/40 text-slate-800 rounded-tl-none"
    );

    const MarkdownBubble = ({ children }: { children: React.ReactNode }) => (
      <div
        className={cn(
          "max-w-none prose prose-sm",
          isUser ? "prose-invert prose-indigo" : "prose-slate"
        )}
      >
        {children}
      </div>
    );

    const isKpi = msg.type === "kpi";
    const isChart = msg.type === "chart";
    const isCalendar = msg.type === "calendar";
    const hasActions = !!msg.actions?.length;

    return (
      <div
        key={msg.id}
        className={cn(
          "flex w-full mb-4",
          isUser ? "justify-end" : "justify-start"
        )}
      >
        <div className={bubbleClasses}>
          <MarkdownBubble>
            <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>
              {msg.text}
            </ReactMarkdown>
          </MarkdownBubble>

          {isKpi && renderKpiGrid(msg.data)}
          {isChart && (
            <div className="mt-2">
              <div className="flex items-center gap-2 text-[11px] font-medium text-slate-600 mb-1">
                <BarChart2 className="w-3 h-3" />
                <span>{msg.data?.title || "Performance overview"}</span>
              </div>
              {renderAnalyticsChart(msg.data)}
            </div>
          )}
          {isCalendar && renderCalendarView(msg.data)}

          {hasActions && renderActionsRow(msg)}

          <div
            className={cn(
              "text-[10px] mt-1 opacity-70",
              isUser ? "text-indigo-100" : "text-slate-400"
            )}
          >
            {new Date(msg.time).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>
      </div>
    );
  };

  // --- Styles ---
  const fabStyle: React.CSSProperties = {
    position: "fixed",
    right: 32,
    bottom: 32,
    zIndex: 9999,
  };

  const windowStyle: React.CSSProperties = winState.isMaximized
    ? {
      position: "fixed",
      left: 20,
      top: 20,
      right: 20,
      bottom: 20,
      zIndex: 9999,
    }
    : {
      position: "fixed",
      right: 32,
      bottom: 32,
      width: winState.w,
      height: winState.h,
      zIndex: 9999,
    };

  // --- Tab UI ---
  const tabs: { id: TabId; label: string; icon: React.ComponentType<any> }[] = [
    { id: "chat", label: "Chat", icon: MessageCircle },
    { id: "tasks", label: "Tasks", icon: CheckSquare },
    { id: "calendar", label: "Calendar", icon: CalendarIcon },
    { id: "notifications", label: "Alerts", icon: Bell },
    { id: "support", label: "Support", icon: HelpCircle },
  ];

  return (
    <>
      {/* FAB (Visible when closed) */}
      {!winState.isOpen && (
        <div style={fabStyle} className="group animate-in zoom-in duration-300">
          <button
            onClick={() => setWinState((s) => ({ ...s, isOpen: true }))}
            className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 shadow-xl flex items-center justify-center text-white hover:scale-110 transition-transform duration-200 relative"
          >
            <Sparkles className="w-6 h-6" />
            {messages.filter((m) => m.from === "bot").length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] flex items-center justify-center border-2 border-white">
                {messages.filter((m) => m.from === "bot").length}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Chat Window (Visible when open) */}
      {winState.isOpen && (
        <div
          ref={rootRef}
          style={windowStyle}
          className={cn(
            "flex flex-col rounded-2xl shadow-2xl border border-white/20 bg-white/60 backdrop-blur-xl overflow-hidden transition-all duration-200 animate-in fade-in zoom-in-95 slide-in-from-bottom-5",
            className
          )}
        >
          {/* Header */}
          <div
            ref={headerRef}
            className={cn(
              "flex items-center justify-between px-4 py-3 bg-white/40 border-b border-white/20 select-none"
            )}
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-sm">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold text-sm text-slate-800">
                  Sociovia AI
                </div>
                <div className="text-[10px] text-slate-500 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />{" "}
                  Online · Agent mode
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 text-slate-500">
              <button
                onClick={() => setWinState((s) => ({ ...s, isOpen: false }))}
                className="p-1.5 hover:bg-white/50 rounded-full transition-colors"
                title="Minimize"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
              <button
                onClick={toggleMaximize}
                className="p-1.5 hover:bg-white/50 rounded-full transition-colors"
                title={winState.isMaximized ? "Restore" : "Maximize"}
              >
                {winState.isMaximized ? (
                  <Minimize2 className="w-4 h-4 rotate-45" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={() => setWinState((s) => ({ ...s, isOpen: false }))}
                className="p-1.5 hover:bg-white/50 rounded-full transition-colors hover:bg-red-100 hover:text-red-500"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-1 px-2 py-2 bg-white/30 border-b border-white/20">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              let badge = 0;
              if (tab.id === "tasks")
                badge = tasks.filter((t) => t.status === "pending").length;
              if (tab.id === "notifications")
                badge = notifications.filter((n) => !n.read).length;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-medium transition-all relative",
                    isActive
                      ? "bg-white/90 text-indigo-600 shadow-sm"
                      : "text-slate-600 hover:bg-white/50"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  {badge > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white rounded-full text-[9px] flex items-center justify-center">
                      {badge > 9 ? "9+" : badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Content (Different per tab) */}
          <div
            ref={activeTab === "chat" ? scrollRef : null}
            className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent"
          >
            {/* Chat Tab */}
            {activeTab === "chat" && (
              <>
                {messages.length === 0 && !isTyping && (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
                      <Sparkles className="w-8 h-8 text-indigo-400" />
                    </div>
                    <h3 className="text-sm font-medium text-slate-700 mb-1">
                      How can I help?
                    </h3>
                    <p className="text-xs">
                      Ask me to review campaigns, approve/reject items, inspect
                      performance, or plan your calendar.
                    </p>
                  </div>
                )}

                {messages.map(renderMessage)}

                {isTyping && (
                  <div className="flex justify-start mb-4">
                    <div className="bg-white/80 border border-white/40 px-4 py-3 rounded-2xl rounded-tl-none shadow-sm">
                      <div className="flex gap-1">
                        <span
                          className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0ms" }}
                        />
                        <span
                          className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
                          style={{ animationDelay: "150ms" }}
                        />
                        <span
                          className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
                          style={{ animationDelay: "300ms" }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="mt-2 text-[11px] text-red-500">{error}</div>
                )}
              </>
            )}

            {/* Tasks Tab */}
            {activeTab === "tasks" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-slate-800">
                    Your Tasks
                  </h2>
                  <span className="text-[10px] text-slate-500">
                    {tasks.length} total
                  </span>
                </div>
                {loadingTasks ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    Loading tasks...
                  </div>
                ) : tasks.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    No tasks yet. Ask the AI agent to create tasks for you!
                  </div>
                ) : (
                  tasks.map((task) => {
                    const priorityColor =
                      task.priority === "urgent"
                        ? "text-red-600 bg-red-50"
                        : task.priority === "high"
                          ? "text-orange-600 bg-orange-50"
                          : task.priority === "medium"
                            ? "text-yellow-600 bg-yellow-50"
                            : "text-slate-500 bg-slate-50";

                    const statusIcon =
                      task.status === "completed"
                        ? "✓"
                        : task.status === "in_progress"
                          ? "⏳"
                          : task.status === "cancelled"
                            ? "✗"
                            : "○";

                    return (
                      <div
                        key={task.id}
                        className="rounded-xl border border-white/40 bg-white/70 p-3 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex items-start gap-2 flex-1">
                            <span className="text-lg">{statusIcon}</span>
                            <div className="flex-1">
                              <h3 className="text-xs font-semibold text-slate-800">
                                {task.title}
                              </h3>
                              {task.description && (
                                <p className="text-[11px] text-slate-600 mt-1">
                                  {task.description}
                                </p>
                              )}
                            </div>
                          </div>
                          {task.priority && (
                            <span
                              className={cn(
                                "text-[9px] px-2 py-0.5 rounded-full font-medium",
                                priorityColor
                              )}
                            >
                              {task.priority}
                            </span>
                          )}
                        </div>
                        {task.dueDate && (
                          <div className="flex items-center gap-1 mt-2 text-[10px] text-slate-500">
                            <Clock className="w-3 h-3" />
                            <span>
                              Due:{" "}
                              {new Date(task.dueDate).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Calendar Tab */}
            {activeTab === "calendar" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-slate-800">
                    Your Calendar
                  </h2>
                  <span className="text-[10px] text-slate-500">
                    {calendarEvents.length} events
                  </span>
                </div>
                {loadingEvents ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    Loading events...
                  </div>
                ) : calendarEvents.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    No upcoming events. Ask the AI to help you schedule!
                  </div>
                ) : (
                  calendarEvents.map((event) => {
                    const typeIcon =
                      event.type === "meeting"
                        ? "👥"
                        : event.type === "deadline"
                          ? "⏰"
                          : event.type === "campaign"
                            ? "📢"
                            : event.type === "reminder"
                              ? "🔔"
                              : "📅";

                    return (
                      <div
                        key={event.id}
                        className="rounded-xl border border-white/40 bg-white/70 p-3 shadow-sm"
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-xl">{typeIcon}</span>
                          <div className="flex-1">
                            <h3 className="text-xs font-semibold text-slate-800">
                              {event.title}
                            </h3>
                            {event.description && (
                              <p className="text-[11px] text-slate-600 mt-1">
                                {event.description}
                              </p>
                            )}
                            <div className="flex items-center gap-1 mt-2 text-[10px] text-slate-500">
                              <CalendarIcon className="w-3 h-3" />
                              <span>
                                {new Date(
                                  event.startTime
                                ).toLocaleString()}
                                {event.endTime &&
                                  ` - ${new Date(
                                    event.endTime
                                  ).toLocaleTimeString()}`}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === "notifications" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-slate-800">
                    Notifications
                  </h2>
                  {notifications.filter((n) => !n.read).length > 0 && (
                    <button className="text-[10px] text-indigo-600 hover:underline">
                      Mark all as read
                    </button>
                  )}
                </div>
                {loadingNotifications ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    Loading notifications...
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    No notifications. You're all caught up!
                  </div>
                ) : (
                  notifications.map((notif) => {
                    const typeIcon =
                      notif.type === "success"
                        ? "✓"
                        : notif.type === "error"
                          ? "✗"
                          : notif.type === "warning"
                            ? "⚠"
                            : "ℹ";

                    const typeColor =
                      notif.type === "success"
                        ? "text-green-600 bg-green-50"
                        : notif.type === "error"
                          ? "text-red-600 bg-red-50"
                          : notif.type === "warning"
                            ? "text-orange-600 bg-orange-50"
                            : "text-blue-600 bg-blue-50";

                    return (
                      <div
                        key={notif.id}
                        className={cn(
                          "rounded-xl border p-3 shadow-sm",
                          notif.read
                            ? "border-white/40 bg-white/50 opacity-70"
                            : "border-indigo-200 bg-white/90"
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <span
                            className={cn(
                              "flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold",
                              typeColor
                            )}
                          >
                            {typeIcon}
                          </span>
                          <div className="flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <h3 className="text-xs font-semibold text-slate-800">
                                {notif.title}
                              </h3>
                              {!notif.read && (
                                <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-600 mt-1">
                              {notif.message}
                            </p>
                            <div className="text-[10px] text-slate-400 mt-2">
                              {new Date(
                                notif.timestamp
                              ).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Support Tab */}
            {activeTab === "support" && (
              <div className="space-y-4">
                <div className="text-center py-6">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4 mx-auto">
                    <HelpCircle className="w-8 h-8 text-indigo-400" />
                  </div>
                  <h2 className="text-sm font-semibold text-slate-800 mb-2">
                    Need Help?
                  </h2>
                  <p className="text-xs text-slate-600 mb-4">
                    Choose how you'd like to get support
                  </p>
                </div>

                <div className="space-y-2">
                  <button className="w-full rounded-xl border border-white/40 bg-white/70 p-4 shadow-sm hover:bg-white/90 transition-all text-left">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                        <MessageCircle className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <h3 className="text-xs font-semibold text-slate-800">
                          Chat with AI Agent
                        </h3>
                        <p className="text-[10px] text-slate-600">
                          Get instant answers from our AI assistant
                        </p>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() =>
                      window.open("mailto:support@sociovia.com", "_blank")
                    }
                    className="w-full rounded-xl border border-white/40 bg-white/70 p-4 shadow-sm hover:bg-white/90 transition-all text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                        <AlertCircle className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="text-xs font-semibold text-slate-800">
                          Email Support
                        </h3>
                        <p className="text-[10px] text-slate-600">
                          support@sociovia.com
                        </p>
                      </div>
                    </div>
                  </button>

                  <div className="rounded-xl border border-white/40 bg-white/70 p-4 shadow-sm">
                    <h3 className="text-xs font-semibold text-slate-800 mb-2">
                      Quick Links
                    </h3>
                    <ul className="space-y-2 text-[11px]">
                      <li>
                        <a href="#" className="text-indigo-600 hover:underline">
                          📚 Documentation
                        </a>
                      </li>
                      <li>
                        <a href="#" className="text-indigo-600 hover:underline">
                          💡 Feature Requests
                        </a>
                      </li>
                      <li>
                        <a href="#" className="text-indigo-600 hover:underline">
                          🐛 Report a Bug
                        </a>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-3 bg-white/60 border-t border-white/20 backdrop-blur-md">
            <div className="relative flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="text-slate-400 hover:text-slate-600 hover:bg-white/50"
              >
                <Paperclip className="w-4 h-4" />
              </Button>
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder='Ask anything... (e.g. “review my pending campaigns”)'
                className="flex-1 bg-white/50 border-white/30 focus:bg-white focus:ring-indigo-500/20 rounded-full pl-4 pr-10 transition-all"
              />
              <Button
                onClick={handleSend}
                size="icon"
                className={cn(
                  "absolute right-1 w-8 h-8 rounded-full transition-all duration-200",
                  input.trim()
                    ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                    : "bg-slate-200 text-slate-400 hover:bg-slate-300"
                )}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex justify-between items-center mt-2 px-1">
              <div className="text-[10px] text-slate-400">
                AI Agent active · Can execute actions
              </div>
              {messages.length > 0 && (
                <button
                  onClick={() => {
                    setMessages([]);
                    setConversationId(null);
                    try {
                      localStorage.removeItem(CONVO_STORAGE_KEY);
                    } catch { }
                  }}
                  className="text-[10px] text-slate-400 hover:text-red-500 transition-colors"
                >
                  Clear chat
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
