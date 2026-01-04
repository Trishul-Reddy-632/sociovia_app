import React from 'react';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, MessageSquare, MoreHorizontal, Pencil, Trash2, Building2, Globe, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { ConversationItem } from "../types";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

interface ChatSidebarProps {
    isSidebarOpen: boolean;
    setIsSidebarOpen: (open: boolean) => void;
    conversation: ConversationItem[];
    activeId: string | null;
    setActiveId: (id: string | null) => void;
    onRename?: (id: string, newTitle: string) => void;
    onDelete?: (id: string) => void;
    user?: { email: string } | null;
    workspaceInfo?: any;
}

export function ChatSidebar({
    isSidebarOpen,
    setIsSidebarOpen,
    conversation,
    activeId,
    setActiveId,
    onRename,
    onDelete,
    user,
    workspaceInfo
}: ChatSidebarProps) {
    return (
        <div
            className={cn(
                "fixed inset-y-0 left-0 z-50 w-72 bg-background/95 backdrop-blur-xl border-r transform transition-transform duration-300 ease-in-out flex flex-col shadow-2xl",
                !isSidebarOpen && "-translate-x-full"
            )}
        >
            <div className="p-4 border-b bg-muted/10">
                <Button
                    className="w-full justify-start gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all hover:scale-[1.02]"
                    size="lg"
                    onClick={() => setActiveId(null)}
                >
                    <Plus className="h-5 w-5" />
                    <span className="font-semibold">New Chat</span>
                </Button>
            </div>

            <ScrollArea className="flex-1 px-3 py-4">
                {workspaceInfo && (
                    <div className="mb-6">
                        <div className="px-2 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Workspace
                        </div>
                        <div className="bg-card/50 border rounded-xl p-3 space-y-2 shadow-sm">
                            <div className="flex items-center gap-2 font-medium text-sm">
                                <Building2 className="h-4 w-4 text-primary" />
                                <span className="truncate">{workspaceInfo.business_name || "My Workspace"}</span>
                            </div>
                            {workspaceInfo.website && (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Globe className="h-3 w-3" />
                                    <a href={workspaceInfo.website} target="_blank" rel="noreferrer" className="hover:underline truncate">
                                        {workspaceInfo.website}
                                    </a>
                                </div>
                            )}
                            {workspaceInfo.audience_description && (
                                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                                    <Users className="h-3 w-3 mt-0.5 shrink-0" />
                                    <span className="line-clamp-2">{workspaceInfo.audience_description}</span>
                                </div>
                            )}
                        </div>
                        <Separator className="my-4" />
                    </div>
                )}

                <div className="px-2 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    History
                </div>
                <div className="space-y-1">
                    {conversation.map((chat) => (
                        <div
                            key={chat.id}
                            className={cn(
                                "group flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg cursor-pointer transition-all duration-200 border border-transparent",
                                activeId === chat.id
                                    ? "bg-primary/10 text-primary font-medium border-primary/10 shadow-sm"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                            onClick={() => setActiveId(chat.id)}
                        >
                            <MessageSquare className={cn("h-4 w-4 shrink-0", activeId === chat.id ? "text-primary" : "text-muted-foreground/70")} />
                            <span className="truncate flex-1 font-medium">
                                {chat.title || "New Conversation"}
                            </span>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity -mr-1 hover:bg-background/50"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <MoreHorizontal className="h-3 w-3" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-40">
                                    <DropdownMenuItem onClick={(e) => {
                                        e.stopPropagation();
                                        const newTitle = prompt("Rename chat", chat.title || "");
                                        if (newTitle && onRename) onRename(chat.id, newTitle);
                                    }}>
                                        <Pencil className="mr-2 h-3.5 w-3.5" />
                                        Rename
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        className="text-destructive focus:text-destructive"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (onDelete) onDelete(chat.id);
                                        }}
                                    >
                                        <Trash2 className="mr-2 h-3.5 w-3.5" />
                                        Delete
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    ))}
                    {conversation.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground/50 text-xs italic">
                            No conversations yet
                        </div>
                    )}
                </div>
            </ScrollArea>

            <div className="p-4 border-t bg-muted/5 mt-auto">
                <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer">
                    <Avatar className="h-9 w-9 border-2 border-background shadow-sm">
                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email || 'guest'}`} />
                        <AvatarFallback>U</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate text-foreground">
                            {user?.email?.split('@')[0] || "Guest User"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">Free Plan</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
