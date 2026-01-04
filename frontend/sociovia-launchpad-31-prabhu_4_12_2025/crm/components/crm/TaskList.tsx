import { useState, useEffect } from "react";
import { Plus, CheckSquare } from "lucide-react";
import { Task } from "../../types";
import { api } from "../../api";
import { TaskItem } from "./TaskItem";
import { AnimatedButton } from "../ui/AnimatedButton";

interface TaskListProps {
    entityId: string;
    entityType: "contact" | "lead";
}

export function TaskList({ entityId, entityType }: TaskListProps) {
    // In a real app, you might want to fetch tasks specific to this entity
    // For now, we'll fetch all tasks and filter client-side, or assume the API handles filtering
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState("");
    const [newTaskDate, setNewTaskDate] = useState("");

    useEffect(() => {
        loadTasks();
    }, [entityId]);

    const loadTasks = async () => {
        setLoading(true);
        try {
            // Optimization: API should support filtering by relatedTo
            const allTasks = await api.getTasks();
            // Mock filtering logic if backend doesn't support it yet
            // This assumes api.getTasks returns everything. 
            // Better: api.getTasks({ related_id: entityId })
            const relatedTasks = allTasks.filter((t: Task) => t.relatedTo?.id === entityId);
            setTasks(relatedTasks);
        } catch (error) {
            console.error("Failed to load tasks", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTask = async () => {
        if (!newTaskTitle.trim()) return;

        try {
            const newTask: Partial<Task> = {
                title: newTaskTitle,
                dueDate: newTaskDate || new Date().toISOString(),
                completed: false,
                priority: "medium",
                relatedTo: {
                    type: entityType,
                    id: entityId,
                    name: "Unknown" // Should ideally fetch name
                }
            };

            // Optimistic update
            const tempId = Math.random().toString();
            setTasks([...tasks, { ...newTask, id: tempId } as Task]);
            setIsAdding(false);
            setNewTaskTitle("");

            await api.createTask(newTask);
            loadTasks(); // Refresh to get real ID
        } catch (error) {
            console.error("Failed to create task", error);
        }
    };

    const handleToggleComplete = async (taskId: string, currentStatus: boolean) => {
        // Optimistic update
        setTasks(tasks.map(t => t.id === taskId ? { ...t, completed: !currentStatus } : t));

        try {
            await api.updateTask(taskId, { completed: !currentStatus });
        } catch (error) {
            console.error("Failed to update task", error);
            // Revert on error
            loadTasks();
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <CheckSquare className="h-4 w-4 text-slate-400" /> Tasks
                </h3>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="text-xs font-bold text-violet-600 hover:text-violet-700 flex items-center gap-1"
                >
                    <Plus className="h-3 w-3" /> Add Task
                </button>
            </div>

            {isAdding && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-3 animate-in fade-in slide-in-from-top-2">
                    <input
                        autoFocus
                        type="text"
                        placeholder="What needs to be done?"
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500/20"
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleCreateTask()}
                    />
                    <div className="flex items-center gap-2">
                        <input
                            type="date"
                            className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-600 outline-none"
                            value={newTaskDate}
                            onChange={(e) => setNewTaskDate(e.target.value)}
                        />
                        <div className="flex-1" />
                        <button
                            onClick={() => setIsAdding(false)}
                            className="text-xs font-medium text-slate-500 hover:text-slate-700 px-2"
                        >
                            Cancel
                        </button>
                        <AnimatedButton
                            onClick={handleCreateTask}
                            className="py-1 px-3 text-xs bg-violet-600 text-white hover:bg-violet-700"
                        >
                            Save
                        </AnimatedButton>
                    </div>
                </div>
            )}

            <div className="space-y-2">
                {loading && tasks.length === 0 && <p className="text-xs text-slate-400 pl-2">Loading tasks...</p>}
                {!loading && tasks.length === 0 && !isAdding && (
                    <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                        <p className="text-xs text-slate-400 font-medium">No pending tasks</p>
                        <button onClick={() => setIsAdding(true)} className="text-xs text-violet-600 mt-1 font-bold hover:underline">Create one</button>
                    </div>
                )}
                {tasks.map(task => (
                    <TaskItem key={task.id} task={task} onToggleComplete={handleToggleComplete} />
                ))}
            </div>
        </div>
    );
}
