export type TemplateKind = "post" | "carousel" | "story";

export type PostCandidate = {
    id: string;
    type: "post";
    caption?: string;
    image_hints?: string[];
    suggestions?: string[];
    subtitle?: string;
    meta?: any;
};

export type CarouselCandidate = {
    id: string;
    type: "carousel";
    slides: { caption?: string; image_hint?: string }[];
    suggestions?: string[];
    subtitle?: string;
    meta?: any;
};

export type Candidate = PostCandidate | CarouselCandidate;

export type ConversationItem = {
    id: string;
    prompt: string;
    title?: string;
    theme: string | null;
    template: TemplateKind;
    candidates: Candidate[];
    createdAt: number;
};

export type UploadItem = {
    id: string;
    url: string;
    name?: string;
    size?: number;
    type?: string;
    file?: File | null
};
