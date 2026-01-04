import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, DollarSign, Target, Activity } from 'lucide-react';
import type { MetricsData } from '@/pages/AICampaignBuilder';
import { Progress } from '@/components/ui/progress';

interface MetricsPreviewProps {
  metrics: MetricsData;
}

export default function MetricsPreview({ metrics }: MetricsPreviewProps) {
  const metricsCards = [
    {
      title: 'Estimated Reach',
      value: metrics.estimatedReach,
      icon: TrendingUp,
      color: 'text-primary'
    },
    {
      title: 'Estimated CPC',
      value: metrics.estimatedCPC,
      icon: DollarSign,
      color: 'text-accent'
    },
    {
      title: 'Engagement Rate',
      value: metrics.engagementRate,
      icon: Target,
      color: 'text-success'
    },
    {
      title: 'Confidence Level',
      value: `${metrics.confidenceLevel}%`,
      icon: Activity,
      color: 'text-primary'
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance Metrics Preview</CardTitle>
        <CardDescription>
          AI-estimated campaign performance based on your configuration
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {metricsCards.map((metric) => (
            <Card key={metric.title} className="border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-primary/10`}>
                    <metric.icon className={`w-5 h-5 ${metric.color}`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">{metric.title}</p>
                    <p className="text-lg font-bold">{metric.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-6 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">AI Confidence Score</span>
            <span className="font-medium">{metrics.confidenceLevel}%</span>
          </div>
          <Progress value={metrics.confidenceLevel} className="h-2" />
          <p className="text-xs text-muted-foreground">
            Based on historical data and AI analysis of similar campaigns
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
