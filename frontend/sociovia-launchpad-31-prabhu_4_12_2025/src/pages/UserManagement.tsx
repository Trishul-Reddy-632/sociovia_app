import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { API_ENDPOINT } from "@/config";

type Member = { id: number; name: string; email: string; role: string };

const API_LIST = `${API_ENDPOINT}/workspace/users`;
const API_INVITE = `${API_ENDPOINT}/workspace/invite`;
const API_REMOVE = (id: number) => `${API_ENDPOINT}/workspace/users/${id}`;

const UserManagement = (): JSX.Element => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Manager");
  const { toast } = useToast();

  useEffect(() => {
    fetchMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const res = await fetch(API_LIST, { credentials: "include" });
      let data: any = null;
      try { data = await res.json(); } catch {}
      if (res.ok && data?.members) {
        setMembers(data.members);
      } else {
        // fallback demo members if endpoint missing
        setMembers([
          { id: 1, name: "Alice", email: "alice@example.com", role: "Admin" },
          { id: 2, name: "Bob", email: "bob@example.com", role: "Manager" },
        ]);
      }
    } catch (err) {
      console.error("Fetch members error", err);
      setMembers([
        { id: 1, name: "Alice", email: "alice@example.com", role: "Admin" },
        { id: 2, name: "Bob", email: "bob@example.com", role: "Manager" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const invite = async () => {
    if (!inviteEmail.trim()) {
      toast({ title: "Email required", description: "Provide an email to invite", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(API_INVITE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      let data: any = null;
      try { data = await res.json(); } catch {}
      if (res.ok && data?.success) {
        toast({ title: "Invitation sent", description: `${inviteEmail} invited as ${inviteRole}` });
        // optimistic append (if backend returns member, use that)
        setMembers(prev => [...prev, data.member || { id: Date.now(), name: inviteEmail.split("@")[0], email: inviteEmail.trim(), role: inviteRole }]);
        setInviteEmail("");
      } else {
        toast({ title: "Invite failed", description: data?.error || "Could not send invite", variant: "destructive" });
      }
    } catch (err) {
      console.error("Invite error", err);
      toast({ title: "Error", description: "Failed to invite", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const removeMember = async (id: number) => {
    if (!confirm("Remove this member?")) return;
    setLoading(true);
    try {
      const res = await fetch(API_REMOVE(id), { method: "DELETE", credentials: "include" });
      if (res.ok) {
        setMembers(prev => prev.filter(m => m.id !== id));
        toast({ title: "Member removed" });
      } else {
        toast({ title: "Remove failed", description: "Could not remove member", variant: "destructive" });
      }
    } catch (err) {
      console.error("Remove error", err);
      toast({ title: "Error", description: "Failed to remove member", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-3xl mx-auto mt-8">
      <CardHeader>
        <CardTitle>Team & Permissions</CardTitle>
      </CardHeader>

      <CardContent>
        <div className="mb-4">
          <Label>Invite team member</Label>
          <div className="flex gap-2 mt-2">
            <Input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="name@example.com" />
            <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="p-2 border rounded">
              <option>Admin</option>
              <option>Manager</option>
              <option>Analyst</option>
            </select>
            <Button onClick={invite} disabled={loading}>Invite</Button>
          </div>
        </div>

        <div>
          <div className="mb-2 font-medium">Current members</div>
          {loading && <div className="text-xs text-muted-foreground">Loading…</div>}
          <div className="space-y-2">
            {members.map(m => (
              <div key={m.id} className="flex items-center justify-between p-2 border rounded">
                <div>
                  <div className="font-medium">{m.name}</div>
                  <div className="text-xs text-muted-foreground">{m.email} • {m.role}</div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => alert(`Edit ${m.email} — implement role UI later`)}>Edit</Button>
                  <Button variant="destructive" size="sm" onClick={() => removeMember(m.id)}>Remove</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserManagement;
