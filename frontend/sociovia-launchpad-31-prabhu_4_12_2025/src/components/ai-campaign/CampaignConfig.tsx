import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { CampaignConfigData } from '@/pages/AICampaignBuilder';

interface CampaignConfigProps {
  config: CampaignConfigData;
  onConfigChange: (config: CampaignConfigData) => void;
}

export default function CampaignConfig({ config, onConfigChange }: CampaignConfigProps) {
  const handleChange = (field: keyof CampaignConfigData, value: string | number) => {
    onConfigChange({ ...config, [field]: value });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Campaign Configuration</CardTitle>
        <CardDescription>
          Set your budget, schedule, and targeting preferences
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="objective">Campaign Objective</Label>
            <Select 
              value={config.objective}
              onValueChange={(value) => handleChange('objective', value)}
            >
              <SelectTrigger id="objective">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sales">Sales</SelectItem>
                <SelectItem value="leads">Lead Generation</SelectItem>
                <SelectItem value="awareness">Brand Awareness</SelectItem>
                <SelectItem value="engagement">Engagement</SelectItem>
                <SelectItem value="traffic">Traffic</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="budget">Daily Budget (₹)</Label>
            <Input
              id="budget"
              type="number"
              min={100}
              value={config.budget}
              onChange={(e) => handleChange('budget', parseInt(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">Minimum ₹100/day</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={config.startDate}
              onChange={(e) => handleChange('startDate', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="endDate">End Date</Label>
            <Input
              id="endDate"
              type="date"
              value={config.endDate}
              onChange={(e) => handleChange('endDate', e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="audience">Audience Targeting</Label>
            <Select 
              value={config.audience}
              onValueChange={(value) => handleChange('audience', value)}
            >
              <SelectTrigger id="audience">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Automatic (AI-Optimized)</SelectItem>
                <SelectItem value="manual">Manual Selection</SelectItem>
                <SelectItem value="lookalike">Lookalike Audience</SelectItem>
                <SelectItem value="custom">Custom Audience</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="placement">Ad Placement</Label>
            <Select 
              value={config.placement}
              onValueChange={(value) => handleChange('placement', value)}
            >
              <SelectTrigger id="placement">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Automatic Placements</SelectItem>
                <SelectItem value="feed">Feed Only</SelectItem>
                <SelectItem value="stories">Stories Only</SelectItem>
                <SelectItem value="manual">Manual Selection</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
          <h4 className="font-medium text-sm mb-2">Budget Summary</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Daily Budget:</span>
              <span className="font-medium">₹{config.budget}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Estimated Total:</span>
              <span className="font-medium">
                ₹{config.budget * Math.ceil((new Date(config.endDate).getTime() - new Date(config.startDate).getTime()) / (1000 * 60 * 60 * 24))}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
