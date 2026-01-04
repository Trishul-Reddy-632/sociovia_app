import { useState, useRef } from "react";
import { UploadCloud, File as FileIcon, X, Loader2, Download } from "lucide-react";
import { api } from "../../api";
import { Attachment } from "../../types";
import { formatDistanceToNow } from "date-fns";

interface FileListProps {
    entityId: string;
    entityType: "contact" | "lead";
}

export function FileList({ entityId, entityType }: FileListProps) {
    const [files, setFiles] = useState<Attachment[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Initial load
    // In a real app, use useEffect to load files:
    // useEffect(() => { loadFiles() }, [entityId]);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setUploading(true);
            try {
                // Mock upload for now if backend isn't ready
                // const newFile = await api.uploadFile(file, entityId, entityType);

                // Optimistic Mock Response
                await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate delay
                const newAttachment: Attachment = {
                    id: Math.random().toString(),
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    url: URL.createObjectURL(file),
                    uploadedAt: new Date().toISOString(),
                    entityId,
                    entityType
                };

                setFiles(prev => [newAttachment, ...prev]);
            } catch (error) {
                console.error("Upload failed", error);
            } finally {
                setUploading(false);
                if (fileInputRef.current) fileInputRef.current.value = "";
            }
        }
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <FileIcon className="h-4 w-4 text-slate-400" /> Documents
                </h3>
                <div className="relative">
                    <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        onChange={handleFileSelect}
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="text-xs font-bold text-violet-600 hover:text-violet-700 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <UploadCloud className="h-3 w-3" />}
                        {uploading ? "Uploading..." : "Upload File"}
                    </button>
                </div>
            </div>

            <div className="space-y-2">
                {files.length === 0 && !uploading && (
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border border-dashed border-slate-200 rounded-xl bg-slate-50/50 p-6 text-center cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                        <p className="text-xs text-slate-400 font-medium">No documents yet.</p>
                        <p className="text-[10px] text-slate-400 mt-1">Click to upload contracts, NDAs, or briefs.</p>
                    </div>
                )}

                {files.map(file => (
                    <div key={file.id} className="group flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-white hover:border-violet-100 hover:shadow-sm transition-all">
                        <div className="h-10 w-10 flex-shrink-0 rounded-lg bg-violet-50 flex items-center justify-center text-violet-600">
                            <FileIcon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{file.name}</p>
                            <p className="text-[10px] text-slate-400 flex items-center gap-2">
                                <span>{formatSize(file.size)}</span>
                                <span>•</span>
                                <span>{formatDistanceToNow(new Date(file.uploadedAt), { addSuffix: true })}</span>
                            </p>
                        </div>
                        <a
                            href={file.url}
                            download
                            className="p-2 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <Download className="h-4 w-4" />
                        </a>
                    </div>
                ))}
            </div>
        </div>
    );
}
