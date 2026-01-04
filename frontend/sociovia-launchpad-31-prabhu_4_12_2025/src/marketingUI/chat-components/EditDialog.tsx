import React from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface EditDialogProps {
    showEditDialog: boolean;
    setShowEditDialog: (open: boolean) => void;
    editPrompt: string;
    setEditPrompt: (prompt: string) => void;
    handleSaveEdit: () => void;
}

export function EditDialog({
    showEditDialog,
    setShowEditDialog,
    editPrompt,
    setEditPrompt,
    handleSaveEdit
}: EditDialogProps) {
    return (
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Candidate</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <Textarea
                        value={editPrompt}
                        onChange={(e) => setEditPrompt(e.target.value)}
                        placeholder="Edit caption..."
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
                    <Button onClick={handleSaveEdit}>Save</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
