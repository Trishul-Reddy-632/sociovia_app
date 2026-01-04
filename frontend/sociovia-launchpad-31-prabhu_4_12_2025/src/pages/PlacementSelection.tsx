import { Smartphone, Layout, Film, MessageCircle, Globe } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useCampaignStore } from '@/store/campaignStore';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const placements = [
  {
    id: 'facebook_feed',
    name: 'Facebook Feed',
    description: 'Show ads in Facebook News Feed',
    icon: Layout,
    color: 'text-blue-600',
  },
  {
    id: 'instagram_feed',
    name: 'Instagram Feed',
    description: 'Show ads in Instagram Feed',
    icon: Smartphone,
    color: 'text-pink-600',
  },
  {
    id: 'stories',
    name: 'Stories & Reels',
    description: 'Full-screen vertical ads',
    icon: Film,
    color: 'text-purple-600',
  },
  {
    id: 'messenger',
    name: 'Messenger',
    description: 'Ads in Messenger conversations',
    icon: MessageCircle,
    color: 'text-blue-500',
  },
  {
    id: 'audience_network',
    name: 'Audience Network',
    description: 'Extend reach to partner apps',
    icon: Globe,
    color: 'text-green-600',
  },
];

export default function PlacementSelection() {
  const { placements: selectedPlacements, setPlacements, setStep } = useCampaignStore();
  const navigate = useNavigate();

  const handleAutomaticToggle = () => {
    setPlacements({ automatic: !selectedPlacements.automatic, manual: [] });
  };

  const handlePlacementToggle = (placementId: string) => {
    const current = selectedPlacements.manual;
    const updated = current.includes(placementId)
      ? current.filter((id) => id !== placementId)
      : [...current, placementId];
    setPlacements({ manual: updated, automatic: false });
  };

  const handleContinue = () => {
    if (!selectedPlacements.automatic && selectedPlacements.manual.length === 0) {
      toast.error('Please select at least one placement or use automatic placements');
      return;
    }
    setStep(5);
    navigate('/creative');
    toast.success('Placement settings saved');
  };

  const handleBack = () => {
    setStep(3);
    navigate('/budget');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-fade-in">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">Choose ad placements</h1>
        <p className="text-lg text-muted-foreground">
          Select where your ads will appear across Meta platforms
        </p>
      </div>

      {/* Automatic Placements */}
      <Card className={cn('mb-6 shadow-medium cursor-pointer transition-all', selectedPlacements.automatic && 'ring-2 ring-primary')} onClick={handleAutomaticToggle}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <CardTitle>Automatic Placements</CardTitle>
                <Badge variant="secondary" className="bg-success text-success-foreground">
                  Recommended
                </Badge>
              </div>
              <CardDescription>
                Let Meta automatically place your ads where they're likely to perform best. This typically results in better performance and lower costs.
              </CardDescription>
            </div>
            <Checkbox
              checked={selectedPlacements.automatic}
              onCheckedChange={handleAutomaticToggle}
              className="mt-1"
            />
          </div>
        </CardHeader>
      </Card>

      {/* Manual Placements */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-2xl font-semibold">Manual Placements</h2>
          {!selectedPlacements.automatic && selectedPlacements.manual.length > 0 && (
            <Badge variant="outline">{selectedPlacements.manual.length} selected</Badge>
          )}
        </div>
        <p className="text-muted-foreground mb-6">
          Or choose specific placements for more control over where your ads appear
        </p>

        <div className="grid md:grid-cols-2 gap-4">
          {placements.map((placement) => {
            const Icon = placement.icon;
            const isSelected = selectedPlacements.manual.includes(placement.id);
            const isDisabled = selectedPlacements.automatic;

            return (
              <Card
                key={placement.id}
                className={cn(
                  'cursor-pointer transition-all hover:shadow-medium',
                  isSelected && 'ring-2 ring-primary',
                  isDisabled && 'opacity-50 cursor-not-allowed'
                )}
                onClick={() => !isDisabled && handlePlacementToggle(placement.id)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={cn('p-3 rounded-lg bg-secondary', isSelected && 'bg-primary/10')}>
                      <Icon className={cn('w-6 h-6', isSelected ? 'text-primary' : placement.color)} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold">{placement.name}</h3>
                        <Checkbox checked={isSelected} disabled={isDisabled} />
                      </div>
                      <p className="text-sm text-muted-foreground">{placement.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Info Card */}
      <Card className="bg-primary/5 border-primary/20 mb-8">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-2">💡 Placement Tips</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• <strong>Automatic placements</strong> typically deliver 20-30% better results</li>
            <li>• <strong>Stories & Reels</strong> require vertical (9:16) creative for best performance</li>
            <li>• <strong>Audience Network</strong> extends your reach to thousands of partner apps</li>
          </ul>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={handleBack}>
          Back
        </Button>
        <Button onClick={handleContinue}>Continue to Creative</Button>
      </div>
    </div>
  );
}
