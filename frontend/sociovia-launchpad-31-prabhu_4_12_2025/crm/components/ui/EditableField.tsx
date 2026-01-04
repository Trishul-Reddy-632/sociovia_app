import { useState, useEffect, useRef } from "react";
import { Check, X, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

interface EditableFieldProps {
    value: string;
    onSave: (newValue: string) => void;
    label?: string;
    type?: "text" | "email" | "tel" | "url";
    className?: string;
    placeholder?: string;
    isEditing?: boolean; // Can be controlled externally
}

export function EditableField({ value, onSave, label, type = "text", className, placeholder, isEditing: externalIsEditing }: EditableFieldProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [currentValue, setCurrentValue] = useState(value);
    const inputRef = useRef<HTMLInputElement>(null);

    // Sync with external control if provided
    const editing = externalIsEditing !== undefined ? externalIsEditing : isEditing;

    useEffect(() => {
        setCurrentValue(value);
    }, [value]);

    useEffect(() => {
        if (editing && inputRef.current) {
            inputRef.current.focus();
        }
    }, [editing]);

    const handleSave = () => {
        if (currentValue !== value) {
            onSave(currentValue);
        }
        setIsEditing(false);
    };

    const handleWrapperClick = () => {
        if (externalIsEditing === undefined) {
            setIsEditing(true);
        }
    }

    if (editing) {
        return (
            <div className={cn("relative w-full", className)}>
                {label && <p className="text-xs text-slate-400 mb-1">{label}</p>}
                <div className="flex items-center gap-2">
                    <input
                        ref={inputRef}
                        type={type}
                        value={currentValue}
                        onChange={(e) => setCurrentValue(e.target.value)}
                        className="w-full rounded-md border border-violet-200 px-2 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                        placeholder={placeholder}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") handleSave();
                            if (e.key === "Escape") {
                                setCurrentValue(value);
                                setIsEditing(false);
                            }
                        }}
                        onBlur={handleSave}
                    />
                    {externalIsEditing === undefined && (
                        <button onClick={handleSave} className="p-1 rounded-md bg-emerald-50 text-emerald-600 hover:bg-emerald-100">
                            <Check className="h-3 w-3" />
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div
            onClick={handleWrapperClick}
            className={cn(
                "group relative flex items-center justify-between rounded-md px-2 py-1 -ml-2 transition-colors hover:bg-slate-100 cursor-pointer min-h-[28px]",
                className
            )}
        >
            <div className="flex flex-col">
                {label && <p className="text-xs text-slate-400">{label}</p>}
                <p className={cn("text-sm text-slate-700 font-medium", !currentValue && "text-slate-400 italic")}>
                    {currentValue || placeholder || "Empty"}
                </p>
            </div>
            <Pencil className="h-3 w-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
    );
}
