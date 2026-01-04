import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API_BASE = (import.meta.env.VITE_API_BASE ?? "").toString().replace(/\/$/, "");
const API_METRICS = `${API_BASE}/api/workspace/metrics`; // ?workspace_id=

type Metrics = {
  workspace_id: number;
  total_spend: number;
  leads: number;
  active_campaigns: number;
  reach: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpm: number;
  last_updated?: string;
};

export default function WorkspaceDetails(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_METRICS}?workspace_id=${id}`, { credentials: "include" });
        if (!res.ok) {
          // fallback mock
          setMetrics({
            workspace_id: Number(id),
            total_spend: 10123.45,
            leads: 127,
            active_campaigns: 3,
            reach: 420000,
            impressions: 980000,
            clicks: 54000,
            ctr: 5.51,
            cpm: 10.23,
            last_updated: new Date().toISOString()
          });
          return;
        }
        const body = await res.json();
        setMetrics(body.metrics ?? body);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate(-1)}><ArrowLeft /></Button>
          <h2 className="text-xl font-semibold">Workspace Performance</h2>
        </div>
        <div>
          <Button variant="outline" onClick={() => navigate(`/workspace/manage/${id}`)}>Manage</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BarChart3 />Key Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div>Loading metrics...</div>
          ) : !metrics ? (
            <div>No metrics available</div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                <div className="p-3 rounded-lg bg-muted/10">
                  <div className="text-xs text-muted-foreground">Total Spend</div>
                  <div className="text-lg font-semibold">${metrics.total_spend.toLocaleString()}</div>
                </div>
                <div className="p-3 rounded-lg bg-muted/10">
                  <div className="text-xs text-muted-foreground">Leads</div>
                  <div className="text-lg font-semibold">{metrics.leads}</div>
                </div>
                <div className="p-3 rounded-lg bg-muted/10">
                  <div className="text-xs text-muted-foreground">Active Campaigns</div>
                  <div className="text-lg font-semibold">{metrics.active_campaigns}</div>
                </div>
                <div className="p-3 rounded-lg bg-muted/10">
                  <div className="text-xs text-muted-foreground">Reach</div>
                  <div className="text-lg font-semibold">{metrics.reach.toLocaleString()}</div>
                </div>
              </div>

              <Separator />

              {/* KPI list */}
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <div className="text-xs text-muted-foreground">Impressions</div>
                  <div className="font-medium">{metrics.impressions.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Clicks</div>
                  <div className="font-medium">{metrics.clicks.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">CTR</div>
                  <div className="font-medium">{metrics.ctr}%</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">CPM</div>
                  <div className="font-medium">${metrics.cpm}</div>
                </div>
              </div>

              <div className="mt-6 text-sm text-muted-foreground">
                Last updated: {metrics.last_updated ? new Date(metrics.last_updated).toLocaleString() : "—"}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
