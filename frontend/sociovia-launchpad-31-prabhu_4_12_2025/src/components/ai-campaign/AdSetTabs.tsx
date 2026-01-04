import { Button } from "@/components/ui/button";
import { Plus, X, Pencil } from "lucide-react";
import {
    Tabs,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogClose
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { AdSet } from "./CampaignEditorStep";

interface AdSetTabsProps {
    adSets: AdSet[];
    activeAdSetId: string;
    onSelectAdSet: (id: string) => void;
    onAddAdSet: () => void;
    onDeleteAdSet: (id: string) => void;
    onRenameAdSet: (id: string, newName: string) => void;
}

export function AdSetTabs({
    adSets,
    activeAdSetId,
    onSelectAdSet,
    onAddAdSet,
    onDeleteAdSet,
    onRenameAdSet
}: AdSetTabsProps) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [newName, setNewName] = useState("");

    const handleStartRename = (adSet: AdSet) => {
        setEditingId(adSet.id);
        setNewName(adSet.name);
    };

    const handleSaveRename = () => {
        if (editingId && newName.trim()) {
            onRenameAdSet(editingId, newName.trim());
        }
        setEditingId(null);
    };

    return (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4 border-b">
            <Tabs value={activeAdSetId} onValueChange={onSelectAdSet} className="w-full">
                <TabsList className="bg-transparent p-0 h-auto flex gap-2 justify-start">
                    {adSets.map(adSet => (
                        <div key={adSet.id} className="group relative flex items-center">
                            <TabsTrigger
                                value={adSet.id}
                                className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary border border-transparent data-[state=active]:border-primary/20 rounded-md px-4 py-2 h-10 min-w-[120px] justify-between gap-2"
                            >
                                <span className="truncate max-w-[100px]" title={adSet.name}>
                                    {adSet.name}
                                </span>
                            </TabsTrigger>

                            {/* Actions (Rename/Delete) - visible on hover or active */}
                            {activeAdSetId === adSet.id && (
                                <div className="absolute -right-2 -top-2 flex gap-1 bg-white shadow-sm rounded-full p-0.5 border opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                    <Dialog open={editingId === adSet.id} onOpenChange={(open) => !open && setEditingId(null)}>
                                        <DialogTrigger asChild>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleStartRename(adSet); }}
                                                className="p-1 hover:bg-slate-100 rounded-full text-slate-500"
                                            >
                                                <Pencil className="w-3 h-3" />
                                            </button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Rename Ad Set</DialogTitle>
                                            </DialogHeader>
                                            <div className="py-4">
                                                <Input
                                                    value={newName}
                                                    onChange={e => setNewName(e.target.value)}
                                                    placeholder="Ad Set Name"
                                                    onKeyDown={e => e.key === 'Enter' && handleSaveRename()}
                                                />
                                            </div>
                                            <DialogFooter>
                                                <Button variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                                                <Button onClick={handleSaveRename}>Save</Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>

                                    {adSets.length > 1 && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onDeleteAdSet(adSet.id); }}
                                            className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onAddAdSet}
                        className="h-10 px-3 text-slate-500 hover:text-primary hover:bg-primary/5"
                    >
                        <Plus className="w-4 h-4 mr-1" />
                        New Ad Set
                    </Button>
                </TabsList>
            </Tabs>
        </div>
    );
}
