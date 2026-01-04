import React from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface PostDialogProps {
    showPostDialog: boolean;
    setShowPostDialog: (open: boolean) => void;
    socialAccounts: any[];
    selectedAccountIds: string[];
    setSelectedAccountIds: React.Dispatch<React.SetStateAction<string[]>>;
    isPosting: boolean;
    handlePostConfirm: () => void;
}

export function PostDialog({
    showPostDialog,
    setShowPostDialog,
    socialAccounts,
    selectedAccountIds,
    setSelectedAccountIds,
    isPosting,
    handlePostConfirm
}: PostDialogProps) {
    return (
        <Dialog open={showPostDialog} onOpenChange={setShowPostDialog}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Post to Social Media</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <p>Select platforms to post to:</p>
                    <div className="flex flex-col gap-2">
                        {socialAccounts.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No accounts connected.</p>
                        ) : (
                            socialAccounts.map((acc: any) => (
                                <div key={acc.db.id} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`acc-${acc.db.id}`}
                                        checked={selectedAccountIds.includes(acc.db.id)}
                                        onCheckedChange={(checked) => {
                                            if (checked) setSelectedAccountIds(prev => [...prev, acc.db.id]);
                                            else setSelectedAccountIds(prev => prev.filter(id => id !== acc.db.id));
                                        }}
                                    />
                                    <Label htmlFor={`acc-${acc.db.id}`}>{acc.db.platform} - {acc.db.account_name}</Label>
                                </div>
                            ))
                        )}
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setShowPostDialog(false)}>Cancel</Button>
                    <Button onClick={handlePostConfirm} disabled={isPosting || selectedAccountIds.length === 0}>
                        {isPosting ? "Posting..." : "Post"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
