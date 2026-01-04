import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Trash2, Download, ExternalLink, Eye, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export type Asset = {
  id: string;
  url: string;
  name?: string;
  size?: number;
  type?: string;
  file?: File | null;
};

interface AssetsManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assets: Asset[];
  onAddAssets: (files: FileList) => void;
  onRemoveAsset: (id: string) => void;
  onSelectAssets?: (selectedIds: string[]) => void;
  selectionMode?: boolean;
}

export function AssetsManager({
  open,
  onOpenChange,
  assets,
  onAddAssets,
  onRemoveAsset,
  onSelectAssets,
  selectionMode = false,
}: AssetsManagerProps) {
  const { toast } = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewImage, setViewImage] = useState<string | null>(null);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onAddAssets(e.target.files);
      toast({ description: `Added ${e.target.files.length} asset(s)` });
      e.target.value = '';
    }
  };

  const downloadAsset = async (asset: Asset) => {
    try {
      const response = await fetch(asset.url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = asset.name || `asset-${asset.id}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ description: 'Download started' });
    } catch (error) {
      toast({ description: 'Failed to download asset', variant: 'destructive' });
    }
  };

  const confirmSelection = () => {
    if (onSelectAssets) {
      onSelectAssets(Array.from(selected));
      setSelected(new Set());
      onOpenChange(false);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Assets Manager</SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            {/* Upload Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Upload Assets
                </CardTitle>
              </CardHeader>
              <CardContent>
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground">PNG, JPG, GIF up to 10MB</p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    multiple
                    accept="image/*"
                    onChange={handleFileUpload}
                  />
                </label>
              </CardContent>
            </Card>

            {/* Assets Grid */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Your Assets ({assets.length})</h3>
                {selectionMode && selected.size > 0 && (
                  <Badge variant="secondary">{selected.size} selected</Badge>
                )}
              </div>

              {assets.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    No assets yet. Upload some images to get started.
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {assets.map((asset) => (
                    <Card
                      key={asset.id}
                      className={cn(
                        'overflow-hidden transition-all',
                        selectionMode && selected.has(asset.id) && 'ring-2 ring-primary'
                      )}
                    >
                      <div className="relative aspect-square">
                        <img
                          src={asset.url}
                          alt={asset.name || 'Asset'}
                          className="w-full h-full object-cover cursor-pointer"
                          onClick={() => setViewImage(asset.url)}
                        />
                        {selectionMode && (
                          <div className="absolute top-2 left-2">
                            <Checkbox
                              checked={selected.has(asset.id)}
                              onCheckedChange={() => toggleSelect(asset.id)}
                            />
                          </div>
                        )}
                      </div>
                      <CardContent className="p-2 space-y-2">
                        <p className="text-xs font-medium truncate">{asset.name || 'Untitled'}</p>
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => setViewImage(asset.url)}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => downloadAsset(asset)}
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => onRemoveAsset(asset.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            {selectionMode && (
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelected(new Set());
                    onOpenChange(false);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmSelection}
                  disabled={selected.size === 0}
                  className="flex-1"
                >
                  Use Selected ({selected.size})
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Image Viewer Dialog */}
      <Dialog open={!!viewImage} onOpenChange={() => setViewImage(null)}>
        <DialogContent className="max-w-4xl p-0">
          <img
            src={viewImage || ''}
            alt="Asset preview"
            className="w-full h-auto max-h-[90vh] object-contain"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
