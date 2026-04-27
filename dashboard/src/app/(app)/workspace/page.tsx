"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Building2, Check, Copy, Crown, Loader2, Mail, Plus, Shield, ShieldAlert, Trash2, UserMinus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { hasPublicSupabaseUrl } from "@/lib/env";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type WorkspaceRow = { id: string; name: string; slug: string; role: string };
type MemberRow = { user_id: string; email: string; role: string; created_at: string };
type InviteRow = { id: string; email: string; role: string; expires_at: string; created_at: string };

const useCloud = hasPublicSupabaseUrl();

export default function WorkspacePage() {
  const [workspaces, setWorkspaces] = useState<WorkspaceRow[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [createName, setCreateName] = useState("");
  const [createSlug, setCreateSlug] = useState("");

  const [members, setMembers] = useState<MemberRow[]>([]);
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [renameName, setRenameName] = useState("");

  const refreshWorkspaces = useCallback(async () => {
    if (!useCloud) return;
    const res = await fetch("/api/workspaces", { credentials: "include" });
    const j = (await res.json()) as { workspaces?: WorkspaceRow[]; error?: string };
    if (!res.ok) {
      setError(j.error ?? "Could not load workspaces");
      return;
    }
    const list = j.workspaces ?? [];
    setWorkspaces(list);
    setSelectedId((prev) => prev || list[0]?.id || "");
  }, []);

  const loadMembersAndInvites = useCallback(async (orgId: string) => {
    if (!useCloud || !orgId) {
      setMembers([]);
      setInvites([]);
      return;
    }
    const [mRes, iRes] = await Promise.all([
      fetch(`/api/workspaces/${orgId}/members`, { credentials: "include" }),
      fetch(`/api/workspaces/${orgId}/invites`, { credentials: "include" }),
    ]);
    const mj = (await mRes.json()) as { members?: MemberRow[]; error?: string };
    const ij = (await iRes.json()) as { invites?: InviteRow[]; error?: string };
    if (mRes.ok) setMembers(mj.members ?? []);
    if (iRes.ok) setInvites(ij.invites ?? []);
  }, []);

  useEffect(() => {
    if (!useCloud) {
      setLoading(false);
      return;
    }
    void (async () => {
      setLoading(true);
      setError(null);
      await refreshWorkspaces();
      setLoading(false);
    })();
  }, [refreshWorkspaces]);

  useEffect(() => {
    if (selectedId) void loadMembersAndInvites(selectedId);
  }, [selectedId, loadMembersAndInvites]);

  useEffect(() => {
    if (typeof window === "undefined" || !useCloud) return;
    const token = new URLSearchParams(window.location.search).get("invite");
    if (!token?.trim()) return;
    void (async () => {
      setBusy(true);
      setError(null);
      const res = await fetch("/api/invites/accept", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim() }),
      });
      const j = (await res.json()) as { organizationId?: string; error?: string };
      if (!res.ok) {
        setError(j.error ?? "Could not accept invite");
        setBusy(false);
        window.history.replaceState({}, "", "/workspace");
        return;
      }
      await refreshWorkspaces();
      if (j.organizationId) {
        setSelectedId(j.organizationId);
        await fetch("/api/workspaces/active", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ organizationId: j.organizationId }),
        });
      }
      window.history.replaceState({}, "", "/workspace");
      setBusy(false);
    })();
  }, [refreshWorkspaces]);

  const setActiveWorkspace = async (orgId: string | null) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/workspaces/active", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: orgId }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(j.error ?? "Could not update active workspace");
        return;
      }
      if (orgId) setSelectedId(orgId);
    } finally {
      setBusy(false);
    }
  };

  const createWorkspace = async () => {
    if (!createName.trim() || !createSlug.trim()) {
      setError("Name and slug are required");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: createName.trim(), slug: createSlug.trim() }),
      });
      const j = (await res.json()) as { id?: string; error?: string };
      if (!res.ok) {
        setError(j.error ?? "Create failed");
        return;
      }
      setCreateName("");
      setCreateSlug("");
      await refreshWorkspaces();
      if (j.id) {
        setSelectedId(j.id);
        await setActiveWorkspace(j.id);
      }
    } finally {
      setBusy(false);
    }
  };

  const sendInvite = async () => {
    if (!selectedId || !inviteEmail.trim()) return;
    setBusy(true);
    setError(null);
    setLastInviteUrl(null);
    try {
      const res = await fetch(`/api/workspaces/${selectedId}/invites`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      const j = (await res.json()) as { token?: string; error?: string };
      if (!res.ok) {
        setError(j.error ?? "Invite failed");
        return;
      }
      const origin = window.location.origin;
      setLastInviteUrl(`${origin}/workspace?invite=${j.token}`);
      setInviteEmail("");
      await loadMembersAndInvites(selectedId);
    } finally {
      setBusy(false);
    }
  };

  const copyInvite = async () => {
    if (!lastInviteUrl) return;
    await navigator.clipboard.writeText(lastInviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const selected = workspaces.find((w) => w.id === selectedId);
  const isAdmin = selected?.role === "owner" || selected?.role === "admin";
  const isOwner = selected?.role === "owner";

  useEffect(() => {
    setRenameName(selected?.name ?? "");
  }, [selected?.name]);

  const initialsForEmail = (email: string) => {
    const local = (email.split("@")[0] ?? "?").replace(/[^a-z0-9]/gi, "");
    return local.slice(0, 2).toUpperCase() || "?";
  };

  const updateMemberRole = async (memberUserId: string, nextRole: "admin" | "member") => {
    if (!selectedId) return;
    if (!confirm(`Change member role to ${nextRole}?`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/workspaces/${selectedId}/members/${memberUserId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(j.error ?? "Role update failed");
        return;
      }
      await loadMembersAndInvites(selectedId);
    } finally {
      setBusy(false);
    }
  };

  const removeMember = async (memberUserId: string, email: string) => {
    if (!selectedId) return;
    if (!confirm(`Remove ${email} from this workspace?`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/workspaces/${selectedId}/members/${memberUserId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(j.error ?? "Remove member failed");
        return;
      }
      await loadMembersAndInvites(selectedId);
    } finally {
      setBusy(false);
    }
  };

  const transferOwnership = async (newOwnerUserId: string, email: string) => {
    if (!selectedId) return;
    if (!confirm(`Transfer ownership to ${email}? This action is high impact.`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/workspaces/${selectedId}/ownership`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newOwnerUserId }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(j.error ?? "Ownership transfer failed");
        return;
      }
      await refreshWorkspaces();
      await loadMembersAndInvites(selectedId);
    } finally {
      setBusy(false);
    }
  };

  const renameWorkspace = async () => {
    if (!selectedId || !renameName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/workspaces/${selectedId}/settings`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: renameName.trim() }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(j.error ?? "Rename failed");
        return;
      }
      await refreshWorkspaces();
    } finally {
      setBusy(false);
    }
  };

  const leaveWorkspace = async () => {
    if (!selectedId) return;
    if (!confirm("Leave this workspace? You will lose shared scan/template visibility.")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/workspaces/${selectedId}/leave`, {
        method: "POST",
        credentials: "include",
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(j.error ?? "Leave workspace failed");
        return;
      }
      await refreshWorkspaces();
      setSelectedId("");
    } finally {
      setBusy(false);
    }
  };

  const deleteWorkspace = async () => {
    if (!selectedId) return;
    if (!confirm("Delete this workspace permanently? This cannot be undone.")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/workspaces/${selectedId}/settings`, {
        method: "DELETE",
        credentials: "include",
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(j.error ?? "Delete workspace failed");
        return;
      }
      await refreshWorkspaces();
      setSelectedId("");
    } finally {
      setBusy(false);
    }
  };

  if (!useCloud) {
    return (
      <div className="mx-auto max-w-lg space-y-4 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">Workspace</h1>
        <p className="text-sm text-muted-foreground">
          Connect Supabase (see <code className="rounded bg-muted px-1 font-mono text-xs">.env.example</code>) and
          apply migrations to create organizations, shared scan history, and invites.
        </p>
        <Button asChild variant="outline">
          <Link href="/overview">Back to overview</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="border-b border-border/60 pb-8">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/20">
            <Building2 className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Team</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Workspace</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Create a workspace, invite teammates (admin or member), then select it as active — scans and the
              workflow library save into the shared pool. Owners and admins manage invites.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Active workspace</CardTitle>
            <CardDescription>
              Sets an httpOnly cookie used by scan save, history, library, and overview metrics.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </p>
            ) : workspaces.length === 0 ? (
              <p className="text-sm text-muted-foreground">No workspaces yet — create one on the right.</p>
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1 space-y-2">
                  <Label htmlFor="ws-pick">Workspace</Label>
                  <select
                    id="ws-pick"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"
                    value={selectedId}
                    onChange={(e) => setSelectedId(e.target.value)}
                  >
                    {workspaces.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.slug}) · {w.role}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" disabled={busy || !selectedId} onClick={() => void setActiveWorkspace(selectedId)}>
                    Set active
                  </Button>
                  <Button type="button" variant="outline" disabled={busy} onClick={() => void setActiveWorkspace(null)}>
                    Personal only
                  </Button>
                </div>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Roles: <strong className="text-foreground">owner</strong> / <strong className="text-foreground">admin</strong>{" "}
              manage invites; <strong className="text-foreground">member</strong> contributes shared scans and reports.
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Plus className="h-4 w-4" aria-hidden />
              Create workspace
            </CardTitle>
            <CardDescription>Slug is URL-safe (lowercase, hyphens). You become owner.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="ws-name">Name</Label>
              <Input id="ws-name" value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="Acme Security" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ws-slug">Slug</Label>
              <Input id="ws-slug" value={createSlug} onChange={(e) => setCreateSlug(e.target.value)} placeholder="acme-security" />
            </div>
            <Button type="button" disabled={busy} onClick={() => void createWorkspace()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {selectedId && (
        <>
          <Card className="border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-4 w-4" aria-hidden />
                Members
              </CardTitle>
              <CardDescription>{selected?.name ?? "Workspace"} — shared visibility for scans and templates.</CardDescription>
            </CardHeader>
            <CardContent className="px-0 pb-2">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-6">Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Controls</TableHead>
                    <TableHead className="pr-6 text-right">Since</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((m) => (
                    <TableRow key={m.user_id}>
                      <TableCell className="pl-6">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7 border border-border">
                            <AvatarFallback className="text-[10px]">{initialsForEmail(m.email)}</AvatarFallback>
                          </Avatar>
                          <span className="font-mono text-xs">{m.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={m.role === "owner" ? "default" : "outline"} className="capitalize">
                          {m.role === "owner" ? <Crown className="mr-1 h-3 w-3" /> : null}
                          {m.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {isAdmin && m.role !== "owner" ? (
                          <div className="flex flex-wrap gap-2">
                            <select
                              className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                              value={m.role === "admin" ? "admin" : "member"}
                              onChange={(e) => void updateMemberRole(m.user_id, e.target.value as "admin" | "member")}
                              disabled={busy}
                            >
                              <option value="member">member</option>
                              <option value="admin">admin</option>
                            </select>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8"
                              onClick={() => void removeMember(m.user_id, m.email)}
                              disabled={busy}
                            >
                              <UserMinus className="mr-1 h-3.5 w-3.5" />
                              Remove
                            </Button>
                            {isOwner ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-8"
                                onClick={() => void transferOwnership(m.user_id, m.email)}
                                disabled={busy}
                              >
                                <Crown className="mr-1 h-3.5 w-3.5" />
                                Transfer ownership
                              </Button>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">No actions</span>
                        )}
                      </TableCell>
                      <TableCell className="pr-6 text-right text-xs text-muted-foreground">
                        {new Date(m.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {isAdmin && (
            <Card className="border-border/80 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Mail className="h-4 w-4" aria-hidden />
                  Invite members
                </CardTitle>
                <CardDescription>
                  Invited user must sign in with the <strong className="text-foreground">same email</strong>, then open
                  the invite link (or visit this page with <code className="rounded bg-muted px-1 font-mono text-[11px]">?invite=</code>
                  ).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="inv-email">Email</Label>
                    <Input
                      id="inv-email"
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="colleague@company.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="inv-role">Role</Label>
                    <select
                      id="inv-role"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as "admin" | "member")}
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>
                <Button type="button" disabled={busy || !inviteEmail.trim()} onClick={() => void sendInvite()}>
                  <Shield className="mr-2 h-4 w-4" />
                  Create invite
                </Button>
                {lastInviteUrl && (
                  <div className="rounded-lg border border-border/80 bg-muted/30 p-3 text-sm">
                    <p className="mb-2 font-medium text-foreground">Invite link</p>
                    <code className="block break-all text-xs text-muted-foreground">{lastInviteUrl}</code>
                    <Button type="button" variant="secondary" size="sm" className="mt-2 gap-1" onClick={() => void copyInvite()}>
                      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied ? "Copied" : "Copy"}
                    </Button>
                  </div>
                )}
                {invites.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Pending</p>
                    <ul className="divide-y divide-border/60 rounded-md border border-border/60 text-sm">
                      {invites.map((i) => (
                        <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                          <span className="font-mono text-xs">{i.email}</span>
                          <span className="text-xs text-muted-foreground">
                            {i.role} · expires {new Date(i.expires_at).toLocaleDateString()}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {selectedId && (
        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShieldAlert className="h-4 w-4" aria-hidden />
              Workspace settings
            </CardTitle>
            <CardDescription>
              Owner/admin can rename workspaces. Owner can transfer ownership or delete workspace. Members can leave.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <div className="space-y-2">
                <Label htmlFor="ws-rename">Workspace name</Label>
                <Input
                  id="ws-rename"
                  value={renameName}
                  onChange={(e) => setRenameName(e.target.value)}
                  disabled={!isAdmin || busy}
                />
              </div>
              <Button type="button" onClick={() => void renameWorkspace()} disabled={!isAdmin || busy || !renameName.trim()}>
                Rename
              </Button>
            </div>

            <div className="rounded-md border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
              <p>
                <strong className="text-foreground">Workspace ID:</strong> {selectedId}
              </p>
              <p className="mt-1">
                Shared scans and templates are visible to all workspace members. Owners have the final authority on
                roles and destructive actions.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => void leaveWorkspace()} disabled={busy || isOwner}>
                Leave workspace
              </Button>
              <Button type="button" variant="destructive" onClick={() => void deleteWorkspace()} disabled={busy || !isOwner}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete workspace
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/workspace/activity">Open activity feed</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        <Link href="/scan/history" className="text-primary underline-offset-2 hover:underline">
          Scan history
        </Link>{" "}
        and{" "}
        <Link href="/workflow-library" className="text-primary underline-offset-2 hover:underline">
          Workflow library
        </Link>{" "}
        follow the active workspace scope. For accountability and governance, see{" "}
        <Link href="/workspace/activity" className="text-primary underline-offset-2 hover:underline">
          workspace activity
        </Link>
        .
      </p>
    </div>
  );
}
