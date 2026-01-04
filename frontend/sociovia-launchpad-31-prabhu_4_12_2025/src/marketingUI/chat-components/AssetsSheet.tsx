import React from 'react';
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Plus, X, Check, UploadCloud, Image as ImageIcon, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { UploadItem } from "../types";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AssetsSheetProps {
    isAssetsOpen: boolean;
    setIsAssetsOpen: (open: boolean) => void;
    uploads: UploadItem[];
    workspaceAssets?: UploadItem[];
    selectedAssets: string[];
    toggleAssetSelection: (id: string) => void;
    removeUpload: (id: string) => void;
    handleUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onPostSelected?: () => void;
}

export function AssetsSheet({
    isAssetsOpen,
    setIsAssetsOpen,
    uploads,
    workspaceAssets = [],
    selectedAssets,
    toggleAssetSelection,
    removeUpload,
    handleUpload,
    onPostSelected
}: AssetsSheetProps) {
    return (
        <Sheet open={isAssetsOpen} onOpenChange={setIsAssetsOpen}>
            <SheetContent className="w-[400px] sm:w-[540px] flex flex-col h-full">
                <SheetHeader className="pb-4 border-b">
                    <SheetTitle className="flex items-center gap-2">
                        <ImageIcon className="h-5 w-5 text-primary" />
                        Asset Library
                    </SheetTitle>
                    <SheetDescription>
                        Manage your uploaded images and assets for generation.
                    </SheetDescription>
                </SheetHeader>

                <div className="flex-1 flex flex-col min-h-0 mt-4">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-muted-foreground">
                            {uploads.length} {uploads.length === 1 ? 'file' : 'files'}
                        </h3>
                        <div className="flex items-center gap-2">
                            {selectedAssets.length > 0 && (
                                <>
                                    <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
                                        {selectedAssets.length} selected
                                    </span>
                                    {onPostSelected && (
                                        <Button size="sm" variant="default" className="h-7 text-xs gap-1" onClick={onPostSelected}>
                                            <Share2 className="h-3 w-3" /> Post Selected
                                        </Button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    <ScrollArea className="flex-1 -mx-6 px-6">
                        {uploads.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground border-2 border-dashed rounded-xl m-1">
                                <UploadCloud className="h-10 w-10 mb-3 opacity-20" />
                                <p className="text-sm">No files uploaded yet.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 gap-3 pb-4">
                                {uploads.map(u => (
                                    <div
                                        key={u.id}
                                        className={cn(
                                            "relative aspect-square group rounded-xl overflow-hidden border cursor-pointer transition-all duration-200",
                                            selectedAssets.includes(u.id)
                                                ? "ring-2 ring-primary ring-offset-2 border-primary"
                                                : "hover:border-primary/50 hover:shadow-md"
                                        )}
                                        onClick={() => toggleAssetSelection(u.id)}
                                    >
                                        <img src={u.url} alt={u.name} className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-110" />

                                        {selectedAssets.includes(u.id) && (
                                            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center backdrop-blur-[1px]">
                                                <div className="bg-primary text-primary-foreground rounded-full p-1 shadow-sm">
                                                    <Check className="h-4 w-4" />
                                                </div>
                                            </div>
                                        )}

                                        <Button
                                            variant="destructive"
                                            size="icon"
                                            className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100 shadow-sm"
                                            onClick={(e) => { e.stopPropagation(); removeUpload(u.id); }}
                                        >
                                            <X className="h-3 w-3" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {workspaceAssets && workspaceAssets.length > 0 && (
                            <div className="mt-6">
                                <h3 className="text-sm font-medium text-muted-foreground mb-3">Workspace Assets</h3>
                                <div className="grid grid-cols-3 gap-3 pb-4">
                                    {workspaceAssets.map(a => (
                                        <div
                                            key={a.id}
                                            className={cn(
                                                "relative aspect-square group rounded-xl overflow-hidden border cursor-pointer transition-all duration-200",
                                                selectedAssets.includes(a.id)
                                                    ? "ring-2 ring-primary ring-offset-2 border-primary"
                                                    : "hover:border-primary/50 hover:shadow-md"
                                            )}
                                            onClick={() => toggleAssetSelection(a.id)}
                                        >
                                            <img src={a.url.replace("https://sociovia-py.onrender.com/", "")} alt={a.name} className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-110" />
                                            {selectedAssets.includes(a.id) && (
                                                <div className="absolute inset-0 bg-primary/20 flex items-center justify-center backdrop-blur-[1px]">
                                                    <div className="bg-primary text-primary-foreground rounded-full p-1 shadow-sm">
                                                        <Check className="h-4 w-4" />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </ScrollArea>

                    <div className="pt-4 border-t mt-auto bg-background">
                        <Label htmlFor="sheet-upload" className="cursor-pointer w-full block">
                            <div className="border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-muted-foreground hover:bg-accent/50 hover:border-primary/50 transition-all group">
                                <div className="h-10 w-10 rounded-full bg-muted group-hover:bg-primary/10 flex items-center justify-center mb-3 transition-colors">
                                    <Plus className="h-6 w-6 group-hover:text-primary transition-colors" />
                                </div>
                                <span className="text-sm font-medium group-hover:text-foreground transition-colors">Upload more files</span>
                                <span className="text-xs text-muted-foreground/70 mt-1">Drag & drop or click to browse</span>
                                <Input
                                    id="sheet-upload"
                                    type="file"
                                    multiple
                                    className="hidden"
                                    onChange={handleUpload}
                                />
                            </div>
                        </Label>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
