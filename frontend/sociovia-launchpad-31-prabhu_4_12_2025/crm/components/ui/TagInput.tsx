import { useState, useRef } from "react";
import { X, Plus, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

interface TagInputProps {
    tags: string[];
    onAddTag: (tag: string) => void;
    onRemoveTag: (tag: string) => void;
    suggestions?: string[];
    allowNew?: boolean;
}

export function TagInput({ tags = [], onAddTag, onRemoveTag, suggestions = ["VIP", "Lead", "Customer", "Friend", "Partner", "Cold"], allowNew = true }: TagInputProps) {
    const [inputValue, setInputValue] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault();
            if (inputValue.trim()) {
                if (allowNew || suggestions.includes(inputValue.trim())) {
                    onAddTag(inputValue.trim());
                    setInputValue("");
                }
            }
        }
    };

    const filteredSuggestions = suggestions.filter(s =>
        s.toLowerCase().includes(inputValue.toLowerCase()) && !tags.includes(s)
    );

    return (
        <div className="w-full space-y-2">
            <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                    <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-700 border border-violet-100">
                        {tag}
                        <button onClick={() => onRemoveTag(tag)} className="text-violet-400 hover:text-violet-900 focus:outline-none">
                            <X className="h-3 w-3" />
                        </button>
                    </span>
                ))}
            </div>

            <div className="relative">
                <div className="flex items-center rounded-md border border-slate-200 bg-white px-3 py-2 shadow-sm focus-within:border-violet-500 focus-within:ring-1 focus-within:ring-violet-500">
                    <Tag className="mr-2 h-4 w-4 text-slate-400" />
                    <input
                        ref={inputRef}
                        type="text"
                        className="flex-1 bg-transparent text-sm placeholder:text-slate-400 focus:outline-none"
                        placeholder="Add a tag..."
                        value={inputValue}
                        onChange={(e) => {
                            setInputValue(e.target.value);
                            setIsOpen(true);
                        }}
                        onFocus={() => setIsOpen(true)}
                        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
                        onKeyDown={handleKeyDown}
                    />
                </div>

                {isOpen && (inputValue || filteredSuggestions.length > 0) && (
                    <div className="absolute z-10 mt-1 w-full overflow-auto rounded-md bg-white p-1 shadow-lg ring-1 ring-black ring-opacity-5 max-h-40">
                        {filteredSuggestions.length === 0 && allowNew && inputValue && (
                            <button
                                className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-sm"
                                onClick={() => {
                                    onAddTag(inputValue);
                                    setInputValue("");
                                }}
                            >
                                Create tag "<span className="font-semibold">{inputValue}</span>"
                            </button>
                        )}
                        {filteredSuggestions.map(suggestion => (
                            <button
                                key={suggestion}
                                className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-sm"
                                onClick={() => {
                                    onAddTag(suggestion);
                                    setInputValue("");
                                }}
                            >
                                {suggestion}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
