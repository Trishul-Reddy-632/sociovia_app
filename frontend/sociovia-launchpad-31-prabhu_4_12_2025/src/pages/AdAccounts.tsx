import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

const API_BASE = (import.meta.env.VITE_API_BASE ?? "").toString().replace(/\/$/, "");
const API_ADACCOUNTS = `${API_BASE}/api/meta/adaccounts`;

type AdAccount = {
  account_id: string;
  name: string;
  currency?: string;
  timezone_id?: number;
};

export default function AdAccounts(): JSX.Element {
  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(API_ADACCOUNTS, { credentials: "include" });
        if (!res.ok) {
          setAccounts([]);
          setLoading(false);
          return;
        }
        const body = await res.json();
        setAccounts(body.ad_accounts ?? []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Ad Accounts</h3>
        <Link to="/workspace/bind-meta"><Button variant="outline">Connect Meta</Button></Link>
      </div>

      <div className="space-y-4">
        {loading ? <div>Loading...</div> : accounts.length === 0 ? (
          <Card><CardContent>No ad accounts connected yet.</CardContent></Card>
        ) : accounts.map((a) => (
          <Card key={a.account_id}>
            <CardHeader className="flex items-center justify-between p-4">
              <div>
                <div className="font-medium">{a.name}</div>
                <div className="text-xs text-muted-foreground">ID: {a.account_id} • {a.currency}</div>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={() => toast({ title: "View campaigns", description: "Navigate to account campaigns" })}>View Campaigns</Button>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
