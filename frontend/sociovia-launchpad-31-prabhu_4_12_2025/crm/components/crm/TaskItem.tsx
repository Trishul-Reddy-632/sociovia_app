import { format } from "date-fns";
import { CheckCircle, Circle, Clock, Calendar } from "lucide-react";
import { Task } from "../../types";
import { cn } from "@/lib/utils";

interface TaskItemProps {
    task: Task;
    onToggleComplete: (id: string, currentStatus: boolean) => void;
}

export function TaskItem({ task, onToggleComplete }: TaskItemProps) {
    const isOverdue = new Date(task.dueDate) < new Date() && !task.completed;

    return (
        <div className={cn(
            "group flex items-start gap-3 rounded-xl border p-3 transition-all",
            task.completed
                ? "bg-slate-50 border-slate-100 opacity-60"
                : "bg-white border-slate-200 hover:border-violet-200 hover:shadow-sm"
        )}>
            <button
                onClick={() => onToggleComplete(task.id, task.completed)}
                className={cn(
                    "mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 transition-colors flex items-center justify-center",
                    task.completed
                        ? "border-emerald-500 bg-emerald-50 text-emerald-600"
                        : "border-slate-300 text-transparent hover:border-violet-400"
                )}
            >
                <CheckCircle className={cn("h-3.5 w-3.5", !task.completed && "opacity-0")} />
            </button>
            <div className="flex-1 min-w-0">
                <p className={cn(
                    "text-sm font-medium transition-all",
                    task.completed ? "text-slate-500 line-through" : "text-slate-800"
                )}>
                    {task.title}
                </p>
                {task.description && (
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{task.description}</p>
                )}
                <div className="mt-2 flex items-center gap-3">
                    <div className={cn(
                        "flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full border",
                        isOverdue
                            ? "bg-red-50 text-red-600 border-red-100"
                            : "bg-slate-50 text-slate-500 border-slate-100"
                    )}>
                        <Calendar className="h-3 w-3" />
                        {task.dueDate ? format(new Date(task.dueDate), "MMM d, yyyy") : "No date"}
                    </div>
                </div>
            </div>
        </div>
    );
}
