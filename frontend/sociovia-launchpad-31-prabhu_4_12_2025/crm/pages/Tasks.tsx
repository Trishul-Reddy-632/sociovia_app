import { GlassCard } from "../components/ui/GlassCard";
import { format } from "date-fns";
import { Task } from "../types";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Calendar, AlertCircle, Plus } from "lucide-react";
import { AnimatedButton } from "../components/ui/AnimatedButton";
import { api } from "../api";

export default function Tasks() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [filter, setFilter] = useState<"all" | "active" | "completed">("active");
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const handleRefresh = () => {
        localStorage.removeItem("sv_crm_tasks");
        setRefreshTrigger(prev => prev + 1);
    };

    useEffect(() => {
        const fetchTasks = async () => {
            setLoading(true);
            try {
                const cacheKey = "sv_crm_tasks";
                const cached = localStorage.getItem(cacheKey);

                if (cached) {
                    try {
                        const parsed = JSON.parse(cached);
                        if (Date.now() - parsed.timestamp < 30 * 60 * 1000) {
                            console.log("Using cached tasks");
                            setTasks(parsed.data || []);
                            setLoading(false);
                            return;
                        }
                    } catch (e) { }
                }

                const data = await api.getTasks();
                setTasks(data || []);

                try {
                    localStorage.setItem(cacheKey, JSON.stringify({
                        timestamp: Date.now(),
                        data: data
                    }));
                } catch (e) { }

            } catch (error) {
                console.error("Failed to fetch tasks", error);
            } finally {
                setLoading(false);
            }
        };
        fetchTasks();
    }, [refreshTrigger]);

    const toggleTask = async (id: string, currentStatus: boolean) => {
        // Optimistic update
        setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
        try {
            await api.updateTask(id, { completed: !currentStatus });
        } catch (error) {
            console.error("Failed to update task", error);
            // Revert on error
            setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: currentStatus } : t));
        } finally {
            localStorage.removeItem("sv_crm_tasks");
        }
    };

    const filteredTasks = tasks.filter(t => {
        if (filter === "active") return !t.completed;
        if (filter === "completed") return t.completed;
        return true;
    });

    if (loading) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-10">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                    <h1 className="text-3xl font-bold text-slate-900">Tasks</h1>
                    <p className="text-slate-500">Keep track of your to-dos.</p>
                </motion.div>
                <div className="flex items-center gap-4">
                    <div className="flex rounded-xl bg-white p-1 border border-slate-200 shadow-sm">
                        {["all", "active", "completed"].map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f as any)}
                                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${filter === f ? "bg-violet-100 text-violet-700 shadow-sm" : "text-slate-400 hover:text-slate-600"
                                    }`}
                            >
                                {f.charAt(0).toUpperCase() + f.slice(1)}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={handleRefresh}
                        className="p-2 bg-white rounded-xl border border-slate-200 text-slate-500 hover:text-violet-600 hover:border-violet-200 shadow-sm transition-all"
                        title="Refresh Tasks"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-rotate-cw"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /></svg>
                    </button>
                    <AnimatedButton onClick={() => setIsCreateOpen(true)}><Plus className="h-4 w-4" /> New Task</AnimatedButton>
                </div>
            </div>

            <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                    {filteredTasks.length === 0 ? (
                        <div className="text-center py-10 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                            No {filter} tasks found.
                        </div>
                    ) : (
                        filteredTasks.map((task) => (
                            <motion.div
                                key={task.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                                layout
                            >
                                <GlassCard className="group relative flex flex-col gap-3 py-5 px-5" hoverEffect>
                                    <div className="flex items-start gap-4">
                                        <button
                                            onClick={() => toggleTask(task.id, task.completed)}
                                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-all mt-1 ${task.completed
                                                ? "bg-emerald-500 border-emerald-500 text-white"
                                                : "border-slate-300 hover:border-violet-500 hover:bg-violet-50 text-transparent"
                                                }`}
                                        >
                                            {task.completed && <Check className="h-4 w-4" />}
                                        </button>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <h4 className={`text-base font-bold text-slate-800 transition-all ${task.completed ? "line-through text-slate-400" : ""}`}>
                                                        {task.title}
                                                    </h4>
                                                    {task.description && (
                                                        <p className={`text-sm mt-1 line-clamp-2 ${task.completed ? "text-slate-300" : "text-slate-500"}`}>
                                                            {task.description}
                                                        </p>
                                                    )}
                                                </div>
                                                {!task.completed && (
                                                    <span className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] uppercase font-bolder tracking-wide border ${task.priority === "high" ? "border-rose-200 text-rose-600 bg-rose-50" :
                                                        task.priority === "medium" ? "border-amber-200 text-amber-600 bg-amber-50" :
                                                            "border-blue-200 text-blue-600 bg-blue-50"
                                                        }`}>
                                                        {task.priority}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex flex-wrap items-center gap-4 mt-3 pt-3 border-t border-slate-50">
                                                <span className={`flex items-center gap-1.5 text-xs font-medium ${task.completed ? "text-slate-300" : "text-slate-500"}`}>
                                                    <Calendar className="h-3.5 w-3.5 opacity-70" />
                                                    {(task.dueDate || task.due_date) ? format(new Date(task.dueDate || task.due_date!), "MMM d, yyyy") : "No due date"}
                                                </span>

                                                {task.relatedTo && (
                                                    <span className={`flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-md ${task.completed ? "bg-slate-50 text-slate-300" : "bg-violet-50 text-violet-600"}`}>
                                                        {task.relatedTo.type === 'lead' && <span className="uppercase text-[9px] opacity-70">Lead:</span>}
                                                        {task.relatedTo.type === 'contact' && <span className="uppercase text-[9px] opacity-70">Contact:</span>}
                                                        {task.relatedTo.type === 'deal' && <span className="uppercase text-[9px] opacity-70">Deal:</span>}
                                                        {task.relatedTo.type === 'campaign' && <span className="uppercase text-[9px] opacity-70">Campaign:</span>}
                                                        <span className="truncate max-w-[150px]">{task.relatedTo.name || "Related Item"}</span>
                                                    </span>
                                                )}

                                            </div>
                                        </div>
                                    </div>

                                    {/* Quick Actions overlay on hover could go here if needed, 
                                        for now we keep it clean */}
                                </GlassCard>
                            </motion.div>
                        )))}
                </AnimatePresence>
            </div>

            <CreateTaskModal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                onSuccess={(newTask) => {
                    setTasks([...tasks, newTask]);
                    setIsCreateOpen(false);
                }}
            />
        </div>
    );
}

function CreateTaskModal({ isOpen, onClose, onSuccess }: { isOpen: boolean; onClose: () => void; onSuccess: (t: Task) => void }) {
    const [formData, setFormData] = useState({ title: "", description: "", dueDate: "", priority: "medium" });
    const [saving, setSaving] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const task = await api.createTask({
                title: formData.title,
                description: formData.description,
                dueDate: formData.dueDate,
                priority: formData.priority as any,
                completed: false
            });
            onSuccess(task!);
            localStorage.removeItem("sv_crm_tasks");
        } catch (error) {
            console.error("Failed to create task", error);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl">
                <h2 className="text-xl font-bold text-slate-900 mb-4">New Task</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                        <input required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                        <textarea className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none resize-none" rows={2} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
                            <input type="date" required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none" value={formData.dueDate} onChange={e => setFormData({ ...formData, dueDate: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                            <select className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none" value={formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value })}>
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex gap-3 justify-end mt-6">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg">Cancel</button>
                        <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg disabled:opacity-50">{saving ? "Creating..." : "Create Task"}</button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}
