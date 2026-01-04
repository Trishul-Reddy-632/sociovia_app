import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy, Download, Save, Edit, Share2, Sparkles, ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";
import { Candidate, UploadItem } from "../types";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface CandidateCardProps {
    candidate: Candidate;
    idx: number;
    uploads: UploadItem[];
    resolveHintToUrl: (hint: string | undefined, kind: "post" | "slide", uploads?: UploadItem[]) => string;
    handleSave: (candidate: Candidate) => void;
    handleEdit: (candidate: Candidate) => void;
    handlePost: (candidate: Candidate) => void;
    setPrompt: (prompt: string) => void;
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    boundUploadIds?: string[];
    onDropUpload?: (uploadId: string) => void;
    onViewImage?: (url: string) => void;
}

export function CandidateCard({
    candidate,
    idx,
    uploads,
    resolveHintToUrl,
    handleSave,
    handleEdit,
    handlePost,
    setPrompt,
    checked,
    onCheckedChange,
    boundUploadIds = [],
    onDropUpload,
    onViewImage
}: CandidateCardProps) {
    const [currentSlide, setCurrentSlide] = useState(0);

    const ActionButton = ({ icon: Icon, label, onClick }: { icon: any, label: string, onClick?: () => void }) => (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors" onClick={onClick}>
                        <Icon className="h-4 w-4" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{label}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );

    const isCarousel = candidate.type === 'carousel';
    const slides = isCarousel ? candidate.slides || [] : [];
    const totalSlides = slides.length;

    const nextSlide = () => setCurrentSlide(prev => (prev + 1) % totalSlides);
    const prevSlide = () => setCurrentSlide(prev => (prev - 1 + totalSlides) % totalSlides);

    const currentImageHint = isCarousel
        ? slides[currentSlide]?.image_hint
        : candidate.image_hints?.[0];

    const currentCaption = isCarousel
        ? slides[currentSlide]?.caption
        : candidate.caption;

    const imageUrl = resolveHintToUrl(currentImageHint, isCarousel ? 'slide' : 'post', uploads);

    return (
        <div className="flex items-start gap-4 group animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mt-2 shrink-0">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center border border-primary/20 shadow-sm">
                    <Sparkles className="h-4 w-4 text-primary" />
                </div>
            </div>
            <Card className="flex-1 max-w-3xl overflow-hidden border-muted/40 shadow-sm hover:shadow-md transition-all duration-300 bg-card/50 backdrop-blur-sm">
                <CardHeader className="pb-3 border-b bg-muted/5 flex flex-row items-center justify-between space-y-0 py-3">
                    <div className="flex items-center gap-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Option {idx + 1}</CardTitle>
                        {isCarousel && (
                            <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-normal">
                                Slide {currentSlide + 1}/{totalSlides}
                            </Badge>
                        )}
                    </div>
                    <Badge variant="outline" className={cn("font-normal text-xs", isCarousel ? "bg-blue-500/10 text-blue-600 border-blue-200" : "bg-green-500/10 text-green-600 border-green-200")}>
                        {isCarousel ? 'Carousel' : 'Post'}
                    </Badge>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="grid md:grid-cols-2 gap-0">
                        {/* Image Section */}
                        <div className="aspect-square bg-muted/30 flex items-center justify-center overflow-hidden relative border-r border-b md:border-b-0 group/image">
                            {imageUrl ? (
                                <>
                                    <img
                                        src={imageUrl}
                                        alt="Generated Content"
                                        className="object-cover w-full h-full transition-transform duration-700 group-hover/image:scale-105"
                                    />
                                    {isCarousel && totalSlides > 1 && (
                                        <>
                                            <Button
                                                variant="secondary"
                                                size="icon"
                                                className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full opacity-0 group-hover/image:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm hover:bg-background"
                                                onClick={(e) => { e.stopPropagation(); prevSlide(); }}
                                            >
                                                <ChevronLeft className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                size="icon"
                                                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full opacity-0 group-hover/image:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm hover:bg-background"
                                                onClick={(e) => { e.stopPropagation(); nextSlide(); }}
                                            >
                                                <ChevronRight className="h-4 w-4" />
                                            </Button>
                                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                                                {slides.map((_, i) => (
                                                    <div
                                                        key={i}
                                                        className={cn(
                                                            "h-1.5 rounded-full transition-all duration-300 shadow-sm",
                                                            i === currentSlide ? "w-4 bg-white" : "w-1.5 bg-white/50"
                                                        )}
                                                    />
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </>
                            ) : (
                                <div className="flex flex-col items-center text-muted-foreground gap-3">
                                    <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                                        <ImageIcon className="h-8 w-8 opacity-20" />
                                    </div>
                                    <span className="text-xs font-medium opacity-70">No Preview Available</span>
                                </div>
                            )}
                        </div>

                        {/* Content Section */}
                        <div className="p-5 flex flex-col h-full min-h-[300px]">
                            <div className="flex-1 space-y-4">
                                <div>
                                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                        {isCarousel ? `Slide ${currentSlide + 1} Caption` : 'Caption'}
                                    </h4>
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90 font-light">
                                        {currentCaption || <span className="italic text-muted-foreground">No caption generated.</span>}
                                    </p>
                                </div>
                            </div>

                            {candidate.suggestions && candidate.suggestions.length > 0 && (
                                <div className="mt-6 pt-4 border-t border-dashed">
                                    <p className="text-xs text-muted-foreground mb-3 font-medium flex items-center gap-1">
                                        <Sparkles className="h-3 w-3" /> Suggested Refinements
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {candidate.suggestions.map((s, i) => (
                                            <Badge
                                                key={i}
                                                variant="secondary"
                                                className="cursor-pointer hover:bg-primary/10 hover:text-primary hover:border-primary/20 transition-all text-xs font-normal py-1.5 px-2.5 border border-transparent"
                                                onClick={() => setPrompt(s)}
                                            >
                                                {s}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="justify-end gap-1 p-2 bg-muted/5 border-t">
                    <ActionButton icon={Copy} label="Copy Caption" onClick={() => navigator.clipboard.writeText(currentCaption || "")} />
                    <ActionButton icon={Download} label="Download Image" />
                    <div className="w-px h-4 bg-border mx-1" />
                    <ActionButton icon={Save} label="Save to Workspace" onClick={() => handleSave(candidate)} />
                    <ActionButton icon={Edit} label="Edit Caption" onClick={() => handleEdit(candidate)} />
                    <ActionButton icon={Share2} label="Post to Social" onClick={() => handlePost(candidate)} />
                </CardFooter>
            </Card>
        </div>
    );
}
