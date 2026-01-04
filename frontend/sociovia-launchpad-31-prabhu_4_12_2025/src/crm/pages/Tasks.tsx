import { GlassCard } from "../components/ui/GlassCard";
import { format } from "date-fns";
import { Task } from "../types";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Calendar, Plus, Search, Trash2, Clock, MoreVertical, X, RotateCcw, AlertCircle } from "lucide-react";
import { AnimatedButton } from "../components/ui/AnimatedButton";
import { api } from "../api";
import { useToast } from "@/hooks/use-toast";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Tasks() {
    const { toast } = useToast();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [filter, setFilter] = useState<"all" | "active" | "completed">("active");
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [page, setPage] = useState(1);
    const ITEMS_PER_PAGE = 15;

    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const handleRefresh = () => {
        localStorage.removeItem("sv_crm_tasks");
        setRefreshTrigger(prev => prev + 1);
        setSelectedIds(new Set());
    };

    // Fetch Logic
    useEffect(() => {
        const fetchTasks = async () => {
            setLoading(true);
            try {
                if (searchQuery.trim().length > 1) {
                    const found = await api.searchTasks(searchQuery);
                    setTasks(found);
                } else {
                    const cacheKey = "sv_crm_tasks";
                    const cached = localStorage.getItem(cacheKey);

                    if (cached) {
                        try {
                            const parsed = JSON.parse(cached);
                            if (Date.now() - parsed.timestamp < 30 * 60 * 1000) {
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
                }
            } catch (error) {
                console.error("Failed to fetch tasks", error);
                toast({ title: "Error", description: "Failed to load tasks", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };

        const timer = setTimeout(fetchTasks, searchQuery ? 400 : 0);
        setPage(1); // Reset page on search or refresh
        return () => clearTimeout(timer);
    }, [refreshTrigger, searchQuery]);

    // Actions
    const toggleTask = async (id: string, currentStatus: boolean) => {
        // Optimistic
        setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !currentStatus } : t));
        try {
            await api.updateTask(id, { completed: !currentStatus });
            localStorage.removeItem("sv_crm_tasks");
        } catch (error) {
            setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: currentStatus } : t)); // Revert
        }
    };

    const handleSnooze = async (id: string, days: number) => {
        try {
            await api.snoozeTask(id, days);
            toast({ title: `Snoozed for ${days} day(s)` });
            handleRefresh();
        } catch (error) {
            toast({ title: "Failed to snooze", variant: "destructive" });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this task?")) return;
        setTasks(prev => prev.filter(t => t.id !== id));
        try {
            await api.deleteTask(id);
            localStorage.removeItem("sv_crm_tasks");
        } catch (e) {
            handleRefresh(); // revert
        }
    };

    // Bulk Actions
    const toggleSelect = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const handleBulkComplete = async (completed: boolean) => {
        const ids = Array.from(selectedIds);
        if (!ids.length) return;

        setTasks(prev => prev.map(t => ids.includes(t.id) ? { ...t, completed } : t));
        setSelectedIds(new Set()); // clear selection immediately for better UX

        try {
            await api.bulkCompleteTasks(ids, completed);
            localStorage.removeItem("sv_crm_tasks");
            toast({ title: `Marked ${ids.length} tasks as ${completed ? 'completed' : 'active'}` });
        } catch (e) {
            handleRefresh();
        }
    };

    const filteredTasks = tasks.filter(t => {
        if (searchQuery) return true; // Search overrides status filter usually, or we can keep it strictly additive
        if (filter === "active") return !t.completed;
        if (filter === "completed") return t.completed;
        return true;
    });

    const totalPages = Math.ceil(filteredTasks.length / ITEMS_PER_PAGE);
    const paginatedTasks = filteredTasks.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

    const getPriorityColor = (p: string) => {
        switch (p) {
            case 'high': return 'text-rose-600 bg-rose-50 border-rose-200';
            case 'medium': return 'text-amber-600 bg-amber-50 border-amber-200';
            case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
            default: return 'text-slate-600 bg-slate-50 border-slate-200';
        }
    };

    return (
        <div className="space-y-6 pb-20 relative h-full flex flex-col">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between shrink-0 px-4 md:px-0">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Tasks</h1>
                    <p className="text-sm md:text-base text-slate-500">Manage your to-dos and follow-ups.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:flex-none">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            className="bg-white border rounded-full pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 w-full md:w-64 shadow-sm"
                            placeholder="Search tasks..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button onClick={handleRefresh} className="p-2.5 bg-white border border-slate-200 shadow-sm md:border-transparent md:bg-transparent md:shadow-none hover:bg-slate-100 rounded-full text-slate-500 transition-colors" title="Refresh">
                        <RotateCcw className="h-4 w-4 md:h-5 md:w-5" />
                    </button>
                    <AnimatedButton onClick={() => setIsCreateOpen(true)} className="bg-violet-600 hover:bg-violet-700 text-white shrink-0"><Plus className="h-4 w-4" /> <span className="hidden sm:inline">New Task</span><span className="inline sm:hidden">New</span></AnimatedButton>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 px-4 md:px-0">
                <div className="flex bg-slate-100 p-1 rounded-lg self-start overflow-x-auto max-w-full">
                    {["active", "completed", "all"].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f as any)}
                            className={`px-3 md:px-4 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${filter === f ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                        >
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                    ))}
                </div>
                <div className="text-xs text-slate-400 hidden sm:block">
                    {filteredTasks.length} tasks
                </div>
            </div>

            {/* Selection Bar (Floating) */}
            <AnimatePresence>
                {selectedIds.size > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                        className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white px-4 md:px-6 py-3 rounded-full shadow-xl flex items-center gap-3 md:gap-4 w-[90%] md:w-auto justify-center"
                    >
                        <span className="font-medium text-xs md:text-sm whitespace-nowrap">{selectedIds.size} selected</span>
                        <div className="h-4 w-[1px] bg-slate-700" />
                        <button onClick={() => handleBulkComplete(true)} className="hover:text-emerald-400 flex items-center gap-1.5 md:gap-2 text-xs md:text-sm whitespace-nowrap">
                            <Check className="h-3.5 w-3.5 md:h-4 md:w-4" /> <span className="hidden xs:inline">Complete</span>
                        </button>
                        <button onClick={() => handleBulkComplete(false)} className="hover:text-amber-400 flex items-center gap-1.5 md:gap-2 text-xs md:text-sm whitespace-nowrap">
                            <Clock className="h-3.5 w-3.5 md:h-4 md:w-4" /> <span className="hidden xs:inline">Active</span>
                        </button>
                        <div className="h-4 w-[1px] bg-slate-700" />
                        <button onClick={() => setSelectedIds(new Set())} className="hover:text-slate-300">
                            <X className="h-4 w-4" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Content Area */}
            <div className="flex-1 min-h-0 bg-white md:rounded-2xl border-y md:border border-slate-200 shadow-sm overflow-hidden flex flex-col mx-0 md:mx-0">
                {/* Desktop Table Header */}
                <div className="hidden md:grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 items-center px-6 py-3 bg-slate-50/50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <div className="w-5">{/* Checkbox */}</div>
                    <div>Task Name</div>
                    <div>Priority</div>
                    <div>Due Date</div>
                    <div>Related To</div>
                    <div className="w-8"></div>
                </div>

                {/* List Body */}
                <div className="flex-1 overflow-y-auto">
                    <AnimatePresence mode="popLayout">
                        {loading ? (
                            <div className="p-6 space-y-4">
                                {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-12 bg-slate-50 rounded-lg animate-pulse" />)}
                            </div>
                        ) : paginatedTasks.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                    <Check className="h-8 w-8 text-slate-300" />
                                </div>
                                <p>No tasks found.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {paginatedTasks.map((task) => (
                                    <motion.div
                                        key={task.id}
                                        layout
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className={`group relative transition-colors ${selectedIds.has(task.id) ? 'bg-violet-50/40' : 'hover:bg-slate-50/50'}`}
                                    >
                                        {/* Desktop View Row */}
                                        <div className="hidden md:grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 items-center px-6 py-3">
                                            <div className="w-5 flex items-center justify-center">
                                                <input
                                                    type="checkbox"
                                                    className={`w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500 cursor-pointer ${selectedIds.has(task.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}
                                                    checked={selectedIds.has(task.id)}
                                                    onChange={() => toggleSelect(task.id)}
                                                />
                                            </div>

                                            <div className="min-w-0 pr-4">
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => toggleTask(task.id, task.completed)}
                                                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all ${task.completed ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 hover:border-violet-500 text-transparent"
                                                            }`}
                                                    >
                                                        <Check className="h-3 w-3" />
                                                    </button>
                                                    <div className="min-w-0">
                                                        <p className={`font-medium truncate ${task.completed ? "line-through text-slate-400" : "text-slate-900"}`}>{task.title}</p>
                                                        {task.description && <p className="text-xs text-slate-400 truncate max-w-sm">{task.description}</p>}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="w-24">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded textxs font-medium border ${getPriorityColor(task.priority)} capitalize`}>
                                                    {task.priority || 'medium'}
                                                </span>
                                            </div>

                                            <div className="w-32 text-sm text-slate-500">
                                                {(task.dueDate || task.due_date) ? (
                                                    <div className={`flex items-center gap-1.5 ${new Date(task.dueDate || task.due_date!) < new Date() && !task.completed ? 'text-rose-600 font-medium' : ''}`}>
                                                        <Calendar className="h-3.5 w-3.5" />
                                                        <span>{format(new Date(task.dueDate || task.due_date!), "MMM d, yyyy")}</span>
                                                    </div>
                                                ) : <span className="text-slate-300 text-xs italic">--</span>}
                                            </div>

                                            <div className="w-32">
                                                {task.relatedTo ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-600 truncate max-w-full" title={task.relatedTo.name}>
                                                        {task.relatedTo.name}
                                                    </span>
                                                ) : <span className="text-slate-300 text-xs italic">--</span>}
                                            </div>

                                            <div className="w-8 flex justify-end">
                                                <TaskMenu task={task} onSnooze={handleSnooze} onDelete={handleDelete} />
                                            </div>
                                        </div>

                                        {/* Mobile View Card */}
                                        <div className="md:hidden p-4 flex gap-3">
                                            <div className="pt-0.5">
                                                <input
                                                    type="checkbox"
                                                    className="w-5 h-5 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                                                    checked={selectedIds.has(task.id)}
                                                    onChange={() => toggleSelect(task.id)}
                                                />
                                            </div>
                                            <div className="flex-1 min-w-0 space-y-2">
                                                <div className="flex justify-between items-start gap-2">
                                                    <div onClick={() => toggleTask(task.id, task.completed)} className="cursor-pointer">
                                                        <p className={`font-medium text-sm ${task.completed ? "line-through text-slate-400" : "text-slate-900"}`}>{task.title}</p>
                                                    </div>
                                                    <TaskMenu task={task} onSnooze={handleSnooze} onDelete={handleDelete} />
                                                </div>

                                                {task.description && <p className="text-xs text-slate-500 line-clamp-2" onClick={() => toggleTask(task.id, task.completed)}>{task.description}</p>}

                                                <div className="flex flex-wrap items-center gap-2 pt-1">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${getPriorityColor(task.priority)} capitalize`}>
                                                        {task.priority || 'medium'}
                                                    </span>
                                                    {(task.dueDate || task.due_date) && (
                                                        <span className={`flex items-center gap-1 text-xs ${new Date(task.dueDate || task.due_date!) < new Date() && !task.completed ? 'text-rose-600 font-medium' : 'text-slate-500'}`}>
                                                            <Calendar className="h-3 w-3" />
                                                            {format(new Date(task.dueDate || task.due_date!), "MMM d")}
                                                        </span>
                                                    )}
                                                    {task.relatedTo && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 truncate max-w-[120px]">
                                                            {task.relatedTo.name}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Pagination Footer */}
                <div className="flex items-center justify-between border-t border-slate-100 p-4 bg-slate-50/50 backdrop-blur text-sm shrink-0">
                    <div className="text-slate-500 hidden sm:block">
                        Showing <span className="font-bold text-slate-700">{Math.min(paginatedTasks.length, filteredTasks.length)}</span> of <span className="font-bold text-slate-700">{filteredTasks.length}</span> tasks
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                        <button
                            onClick={() => setPage(Math.max(1, page - 1))}
                            disabled={page === 1}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors font-medium"
                        >
                            Previous
                        </button>
                        <span className="text-slate-600 font-medium px-2">
                            Page {page} of {totalPages || 1}
                        </span>
                        <button
                            onClick={() => setPage(Math.min(totalPages, page + 1))}
                            disabled={page === totalPages || totalPages === 0}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors font-medium"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>

            <CreateTaskModal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                onSuccess={(newTask) => {
                    handleRefresh();
                    setIsCreateOpen(false);
                }}
            />
        </div>
    );
}

function TaskMenu({ task, onSnooze, onDelete }: { task: Task, onSnooze: (id: string, days: number) => void, onDelete: (id: string) => void }) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600 focus:outline-none transition-colors">
                <MoreVertical className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onSnooze(task.id, 1)}>
                    <Clock className="h-4 w-4 mr-2" /> Snooze 1 day
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSnooze(task.id, 3)}>
                    <Clock className="h-4 w-4 mr-2" /> Snooze 3 days
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSnooze(task.id, 7)}>
                    <Clock className="h-4 w-4 mr-2" /> Snooze 1 week
                </DropdownMenuItem>
                <div className="h-[1px] bg-slate-100 my-1" />
                <DropdownMenuItem onClick={() => onDelete(task.id)} className="text-rose-600 focus:text-rose-700">
                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
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
        } catch (error) {
            console.error("Failed to create task", error);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-slate-900">New Task</h2>
                    <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full"><X className="h-5 w-5 text-slate-400" /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                        <input required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} autoFocus />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                        <textarea className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none resize-none" rows={3} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
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
