import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link as LinkIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function BindMeta(): JSX.Element {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const startMetaFlow = async () => {
    setLoading(true);
    try {
      // In production you would request a server endpoint to get the OAuth URL (server-side prepares CSRF state, redirect URI)
      // Example (replace with yours):
      // const res = await fetch("/api/meta/oauth-url", {credentials: "include"});
      // const body = await res.json();
      // window.open(body.url, "_blank", "noopener");

      // Placeholder UX:
      toast({ title: "Meta binding", description: "This opens the Meta OAuth flow in a new tab (placeholder)." });
      window.open("https://www.facebook.com/business/manager", "_blank", "noopener");
    } catch (err) {
      console.error(err);
      toast({ title: "Failed", description: "Could not start binding flow", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Bind Meta Business</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Connect your Meta Business Manager to enable ad management, ad account linking and pixel sync.
          </p>
          <div className="flex items-center gap-3">
            <Button onClick={startMetaFlow} disabled={loading}><LinkIcon className="mr-2"/> Connect Meta</Button>
            <Button variant="outline" onClick={() => toast({ title: "Docs", description: "See Meta docs for connecting accounts." })}>How it works</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
