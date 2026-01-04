import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useCampaignStore } from '@/store/campaignStore';
import { Facebook, Instagram, Twitter, Linkedin } from 'lucide-react';

interface PostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  caption?: string;
  onPost?: (platforms: string[], caption: string) => Promise<void>;
}

const platformIcons = {
  facebook: Facebook,
  instagram: Instagram,
  twitter: Twitter,
  linkedin: Linkedin,
};

export function PostDialog({ open, onOpenChange, imageUrl, caption = '', onPost }: PostDialogProps) {
  const { toast } = useToast();
  const { setCreative } = useCampaignStore();
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [postCaption, setPostCaption] = useState(caption);
  const [isPosting, setIsPosting] = useState(false);

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform) ? prev.filter(p => p !== platform) : [...prev, platform]
    );
  };

  const handlePost = async () => {
    if (selectedPlatforms.length === 0) {
      toast({ description: 'Please select at least one platform', variant: 'destructive' });
      return;
    }

    setIsPosting(true);
    try {
      if (onPost) {
        await onPost(selectedPlatforms, postCaption);
      } else {
        // Default behavior: save to campaign store and show success
        setCreative({
          imageUrl,
          primaryText: postCaption,
        });
        toast({
          description: `Post prepared for ${selectedPlatforms.join(', ')}. Continue to campaign setup.`,
        });
      }
      onOpenChange(false);
      setSelectedPlatforms([]);
      setPostCaption(caption);
    } catch (error) {
      toast({
        description: 'Failed to post content',
        variant: 'destructive',
      });
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Post to Social Media</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Image Preview */}
          <div className="rounded-lg overflow-hidden border">
            <img src={imageUrl} alt="Post preview" className="w-full h-auto max-h-96 object-contain bg-muted" />
          </div>

          {/* Caption */}
          <div className="space-y-2">
            <Label htmlFor="caption">Caption</Label>
            <Textarea
              id="caption"
              value={postCaption}
              onChange={(e) => setPostCaption(e.target.value)}
              placeholder="Write your post caption..."
              className="min-h-32"
            />
            <p className="text-xs text-muted-foreground">{postCaption.length} characters</p>
          </div>

          {/* Platform Selection */}
          <div className="space-y-3">
            <Label>Select Platforms</Label>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(platformIcons).map(([platform, Icon]) => {
                const isSelected = selectedPlatforms.includes(platform);
                return (
                  <button
                    key={platform}
                    type="button"
                    onClick={() => togglePlatform(platform)}
                    className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <Checkbox checked={isSelected} onCheckedChange={() => togglePlatform(platform)} />
                    <Icon className="h-5 w-5" />
                    <span className="font-medium capitalize">{platform}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePost}
              disabled={isPosting || selectedPlatforms.length === 0}
              className="flex-1"
            >
              {isPosting ? 'Posting...' : `Post to ${selectedPlatforms.length || 0} Platform(s)`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
