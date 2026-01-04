import { useState } from "react";
import { GlassCard } from "@/crm/components/ui/GlassCard";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Search, MoreVertical, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type User = {
    id: string;
    name: string;
    email: string;
    role: "admin" | "user" | "viewer";
    status: "active" | "suspended" | "pending";
    joined: string;
};

const MOCK_USERS: User[] = [
    { id: "1", name: "Alice Admin", email: "admin@sociovia.com", role: "admin", status: "active", joined: "2024-01-15" },
    { id: "2", name: "Bob Builder", email: "bob@tech.com", role: "user", status: "active", joined: "2024-02-20" },
    { id: "3", name: "Charlie Client", email: "charlie@client.com", role: "viewer", status: "active", joined: "2024-03-10" },
    { id: "4", name: "Dave Developer", email: "dave@dev.com", role: "user", status: "suspended", joined: "2024-03-12" },
];

export default function AdminUsers() {
    const [users, setUsers] = useState<User[]>(MOCK_USERS);
    const [search, setSearch] = useState("");
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const { toast } = useToast();

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
    );

    const handleSaveUser = () => {
        if (!editingUser) return;
        setUsers(users.map(u => u.id === editingUser.id ? editingUser : u));
        setEditingUser(null);
        toast({ title: "User Updated", description: "Role and status have been updated." });
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">User Management</h1>
                    <p className="text-slate-500 mt-1">Manage system access and permissions.</p>
                </div>
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search users..."
                        className="pl-10 bg-white shadow-sm border-slate-200 focus:ring-2 focus:ring-emerald-500/20"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <GlassCard className="p-0 overflow-hidden border border-slate-100 shadow-xl shadow-slate-200/40">
                <Table>
                    <TableHeader className="bg-slate-50/50">
                        <TableRow className="border-slate-100">
                            <TableHead className="pl-6 font-bold text-slate-700">User</TableHead>
                            <TableHead className="font-bold text-slate-700">Role</TableHead>
                            <TableHead className="font-bold text-slate-700">Status</TableHead>
                            <TableHead className="font-bold text-slate-700">Joined</TableHead>
                            <TableHead className="text-right pr-6 font-bold text-slate-700">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredUsers.map((user) => (
                            <TableRow key={user.id} className="hover:bg-slate-50/60 transition-colors border-slate-50 h-20">
                                <TableCell className="pl-6">
                                    <div className="flex items-center gap-4">
                                        <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                                            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`} />
                                            <AvatarFallback className="bg-slate-900 text-white font-bold">{user.name[0]}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <div className="font-bold text-slate-900 text-base">{user.name}</div>
                                            <div className="text-sm text-slate-500 font-medium">{user.email}</div>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className={
                                        user.role === 'admin' ? 'bg-indigo-50 text-indigo-700 border-indigo-200 px-3 py-1 text-xs' :
                                            user.role === 'user' ? 'bg-blue-50 text-blue-700 border-blue-200 px-3 py-1 text-xs' :
                                                'bg-slate-50 text-slate-600 border-slate-200 px-3 py-1 text-xs'
                                    }>
                                        {user.role.toUpperCase()}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <div className={`flex items-center gap-2 ${user.status === 'active' ? 'text-emerald-600' :
                                            user.status === 'suspended' ? 'text-red-500' : 'text-amber-500'
                                        }`}>
                                        <div className={`h-2.5 w-2.5 rounded-full ring-4 ring-opacity-20 ${user.status === 'active' ? 'bg-emerald-500 ring-emerald-500' :
                                                user.status === 'suspended' ? 'bg-red-500 ring-red-500' : 'bg-amber-500 ring-amber-500'
                                            }`} />
                                        <span className="text-sm font-bold capitalize">{user.status}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-slate-500 text-sm font-medium">{user.joined}</TableCell>
                                <TableCell className="text-right pr-6">
                                    <Button variant="ghost" size="icon" onClick={() => setEditingUser(user)} className="text-slate-400 hover:text-slate-900 hover:bg-slate-100">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </GlassCard>

            <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit User Permissions</DialogTitle>
                    </DialogHeader>
                    {editingUser && (
                        <div className="grid gap-4 py-4">
                            <div className="flex items-center gap-4 mb-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                                    <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${editingUser.name}`} />
                                    <AvatarFallback>{editingUser.name[0]}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <div className="font-bold text-slate-900 text-lg">{editingUser.name}</div>
                                    <div className="text-sm text-slate-500">{editingUser.email}</div>
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label>System Role</Label>
                                <Select
                                    value={editingUser.role}
                                    onValueChange={(val: any) => setEditingUser({ ...editingUser, role: val })}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="admin">Admin (Full Access)</SelectItem>
                                        <SelectItem value="user">User (Standard)</SelectItem>
                                        <SelectItem value="viewer">Viewer (Read Only)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <Label>Account Status</Label>
                                <Select
                                    value={editingUser.status}
                                    onValueChange={(val: any) => setEditingUser({ ...editingUser, status: val })}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="pending">Pending Review</SelectItem>
                                        <SelectItem value="suspended">Suspended</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingUser(null)}>Cancel</Button>
                        <Button className="bg-slate-900 text-white" onClick={handleSaveUser}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
