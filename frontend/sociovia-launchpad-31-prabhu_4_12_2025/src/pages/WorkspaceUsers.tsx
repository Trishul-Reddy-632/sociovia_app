import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { PlusCircle, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

const API_BASE = (import.meta.env.VITE_API_BASE ?? "").toString().replace(/\/$/, "");
const API_USERS_LIST = `${API_BASE}/api/workspace/users`; // ?workspace_id=
const API_USERS_INVITE = `${API_BASE}/api/workspace/users/invite`; // POST

type TeamMember = {
  id: number;
  name: string;
  email: string;
  role: "Owner" | "Admin" | "Manager" | "Analyst" | "Member";
};

export default function WorkspaceUsers(): JSX.Element {
  const { toast } = useToast();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [role, setRole] = useState("Manager");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        // try to get workspace id from local cache
        const cached = localStorage.getItem("sv_user");
        const user = cached ? JSON.parse(cached) : null;
        const workspaceId = user?.workspace?.id;
        const userId = user?.id;
        const res = await fetch(`${API_USERS_LIST}?workspace_id=${workspaceId}&user_id=${userId}`, { credentials: "include" });
        if (!res.ok) {
          setMembers([
            { id: 1, name: "You", email: "owner@example.com", role: "Owner" },
            { id: 2, name: "Jane Doe", email: "jane@example.com", role: "Manager" }
          ]);
          return;
        }
        const body = await res.json();
        setMembers(body.members ?? body ?? []);
      } catch (err) {
        console.warn(err);
        setMembers([
          { id: 1, name: "You", email: "owner@example.com", role: "Owner" },
          { id: 2, name: "Jane Doe", email: "jane@example.com", role: "Manager" }
        ]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const handleInvite = async () => {
    if (!inviteEmail) {
      toast({ title: "Email required", variant: "destructive" });
      return;
    }
    try {
      const cached = localStorage.getItem("sv_user");
      const user = cached ? JSON.parse(cached) : null;
      const workspaceId = user?.workspace?.id;
      const userId = user?.id;
      const res = await fetch(`${API_USERS_INVITE}?user_id=${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspace_id: workspaceId, email: inviteEmail, role }),
        credentials: "include"
      });
      if (!res.ok) {
        toast({ title: "Invite failed", description: "Could not send invite", variant: "destructive" });
        return;
      }
      const body = await res.json();
      // optimistic add
      setMembers((m) => [...m, { id: Math.random(), name: inviteEmail.split("@")[0], email: inviteEmail, role: role as any }]);
      setInviteEmail("");
      toast({ title: "Invite sent", description: "User invited to workspace" });
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Invite failed", variant: "destructive" });
    }
  };

  const handleRemove = (id: number) => {
    if (!confirm("Remove team member?")) return;
    setMembers((m) => m.filter((x) => x.id !== id));
    toast({ title: "Removed", description: "Team member removed" });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h3 className="text-lg font-semibold mb-4">Team & Permissions</h3>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Invite member</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <Input placeholder="Email address" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
          <select value={role} onChange={(e) => setRole(e.target.value)} className="rounded-md border px-2 py-2">
            <option>Admin</option>
            <option>Manager</option>
            <option>Analyst</option>
            <option>Member</option>
          </select>
          <Button onClick={handleInvite}><PlusCircle className="mr-2" /> Invite</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (<div>Loading...</div>) : (
            <div className="space-y-3">
              {members.map((m) => (
                <div key={m.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/10">
                  <div>
                    <div className="font-medium">{m.name}</div>
                    <div className="text-xs text-muted-foreground">{m.email}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className="bg-muted/20">{m.role}</Badge>
                    {m.role !== "Owner" && <Button variant="destructive" size="sm" onClick={() => handleRemove(m.id)}><Trash2 /></Button>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
