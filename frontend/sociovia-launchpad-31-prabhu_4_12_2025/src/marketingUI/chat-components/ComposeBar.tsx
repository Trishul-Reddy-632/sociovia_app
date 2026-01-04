import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Paperclip, MicIcon, StopCircle, Send, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface ComposeBarProps {
    prompt: string;
    setPrompt: (prompt: string) => void;
    isGenerating: boolean;
    handleGenerate: () => void;
    handleUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    isListening: boolean;
    toggleMic: () => void;
    handleSuggestPrompt: () => void;
}

export function ComposeBar({
    prompt,
    setPrompt,
    isGenerating,
    handleGenerate,
    handleUpload,
    isListening,
    toggleMic,
    handleSuggestPrompt
}: ComposeBarProps) {
    return (
        <div className="p-4 bg-gradient-to-t from-background via-background to-transparent pb-6">
            <div className="max-w-4xl mx-auto relative flex items-end gap-2 bg-background/80 backdrop-blur-md p-2 rounded-2xl border shadow-lg transition-all focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Label htmlFor="file-upload" className="cursor-pointer">
                                <Button variant="ghost" size="icon" className="shrink-0 rounded-xl h-10 w-10 hover:bg-primary/10 hover:text-primary transition-colors" asChild>
                                    <span>
                                        <Paperclip className="h-5 w-5" />
                                        <Input
                                            id="file-upload"
                                            type="file"
                                            multiple
                                            className="hidden"
                                            onChange={handleUpload}
                                        />
                                    </span>
                                </Button>
                            </Label>
                        </TooltipTrigger>
                        <TooltipContent>Attach files</TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                <Textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe what you want to create..."
                    className="min-h-[50px] max-h-[200px] border-0 bg-transparent focus-visible:ring-0 resize-none py-3 text-base placeholder:text-muted-foreground/70"
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleGenerate();
                        }
                    }}
                />

                <div className="flex flex-col gap-1 pb-1">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={cn(
                                        "shrink-0 rounded-xl h-9 w-9 transition-colors",
                                        isListening ? "text-red-500 bg-red-100 hover:bg-red-200" : "hover:bg-primary/10 hover:text-primary"
                                    )}
                                    onClick={toggleMic}
                                >
                                    {isListening ? <StopCircle className="h-5 w-5 animate-pulse" /> : <MicIcon className="h-5 w-5" />}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>{isListening ? "Stop listening" : "Voice input"}</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="shrink-0 rounded-xl h-9 w-9 hover:bg-primary/10 hover:text-primary transition-colors"
                                    onClick={handleSuggestPrompt}
                                >
                                    <Sparkles className="h-5 w-5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Enhance prompt</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    <Button
                        size="icon"
                        className={cn(
                            "shrink-0 rounded-xl h-10 w-10 transition-all duration-300",
                            isGenerating ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground shadow-md hover:shadow-lg hover:scale-105"
                        )}
                        disabled={!prompt.trim() || isGenerating}
                        onClick={handleGenerate}
                    >
                        <Send className={cn("h-5 w-5", isGenerating && "opacity-50")} />
                    </Button>
                </div>
            </div>
            <div className="text-center mt-3 text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">
                Powered by Sociovia AI
            </div>
        </div>
    );
}
