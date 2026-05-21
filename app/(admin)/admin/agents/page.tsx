"use client"

import { useState, useEffect } from "react"
import { Plus, Pencil, Wallet, Trash2, UserCheck, UserX, Loader2 } from "lucide-react"
import { toast } from "sonner"
import apiClient from "@/lib/api"
import { handleApiError } from "@/lib/handleApiError"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

// ─── Types ────────────────────────────────────────────────────────────────────

// Shape returned by GET /api/admin/agents (index)
interface Agent {
  id: string
  name: string
  city: string
  state: string
  cash_balance: number
  max_balance: number
  is_available: boolean
  total_deliveries: number
  balance_percentage: number
}

// Raw shape returned by POST /api/admin/agents (create)
interface AgentCreateResponse {
  id: string
  user_id: string
  city: string
  state: string
  cash_balance: number
  max_balance: number
  is_available: boolean
  total_deliveries: number
  user: { first_name: string; last_name: string } | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computePct(cash: number, max: number) {
  return max > 0 ? Math.min(100, Math.round((cash / max) * 1000) / 10) : 0
}

function normalizeCreated(raw: AgentCreateResponse): Agent {
  return {
    id: raw.id,
    name: raw.user ? `${raw.user.first_name} ${raw.user.last_name}`.trim() : "Unknown",
    city: raw.city,
    state: raw.state,
    cash_balance: Number(raw.cash_balance),
    max_balance: Number(raw.max_balance),
    is_available: raw.is_available,
    total_deliveries: raw.total_deliveries ?? 0,
    balance_percentage: computePct(Number(raw.cash_balance), Number(raw.max_balance)),
  }
}

function balanceColor(pct: number) {
  if (pct < 20) return "bg-red-500"
  if (pct < 50) return "bg-amber-500"
  return "bg-green-500"
}

function balanceTrack(pct: number) {
  if (pct < 20) return "bg-red-100"
  if (pct < 50) return "bg-amber-100"
  return "bg-green-100"
}

function fmt(n: number) {
  return "₦" + n.toLocaleString("en-NG")
}

// ─── Agent Card ───────────────────────────────────────────────────────────────

function AgentCard({
  agent,
  onEdit,
  onTopup,
  onRemove,
}: {
  agent: Agent
  onEdit: (a: Agent) => void
  onTopup: (a: Agent) => void
  onRemove: (a: Agent) => void
}) {
  const pct = Math.min(100, agent.balance_percentage)

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-slate-900 text-sm">{agent.name}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {agent.city}, {agent.state}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0",
            agent.is_available
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-600"
          )}
        >
          {agent.is_available ? (
            <UserCheck className="size-3" />
          ) : (
            <UserX className="size-3" />
          )}
          {agent.is_available ? "Available" : "Unavailable"}
        </span>
      </div>

      {/* Balance progress */}
      <div>
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-slate-500">Cash float</span>
          <span className="font-medium text-slate-700">
            {fmt(agent.cash_balance)}{" "}
            <span className="text-slate-400">/ {fmt(agent.max_balance)}</span>
          </span>
        </div>
        <div className={cn("w-full h-2 rounded-full", balanceTrack(pct))}>
          <div
            className={cn("h-2 rounded-full transition-all", balanceColor(pct))}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-slate-400 mt-1">{pct.toFixed(1)}% capacity</p>
      </div>

      {/* Stats */}
      <div className="text-xs text-slate-500">
        <span className="font-medium text-slate-700">{agent.total_deliveries}</span>{" "}
        deliveries completed
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1 border-t border-slate-100">
        <button
          onClick={() => onEdit(agent)}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 py-1.5 rounded-lg transition-colors"
        >
          <Pencil className="size-3.5" /> Edit
        </button>
        <button
          onClick={() => onTopup(agent)}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-slate-600 hover:text-green-700 hover:bg-green-50 py-1.5 rounded-lg transition-colors"
        >
          <Wallet className="size-3.5" /> Top up
        </button>
        <button
          onClick={() => onRemove(agent)}
          className="flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 transition-colors"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  )
}

// ─── Add Agent Dialog ─────────────────────────────────────────────────────────

function AddAgentDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: (agent: Agent) => void
}) {
  const [form, setForm] = useState({ user_id: "", city: "", state: "", max_balance: "" })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  function reset() {
    setForm({ user_id: "", city: "", state: "", max_balance: "" })
    setError("")
  }

  async function submit(e: React.SyntheticEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await apiClient.post<AgentCreateResponse>("/admin/agents", {
        user_id:     form.user_id.trim(),
        city:        form.city.trim(),
        state:       form.state.trim(),
        max_balance: Number(form.max_balance),
      })
      onCreated(normalizeCreated(res.data))
      toast.success("Agent created successfully.")
      reset()
      onClose()
    } catch (err) {
      setError(handleApiError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose() } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add agent</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="add-user-id">User ID (UUID)</Label>
            <Input
              id="add-user-id"
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              value={form.user_id}
              onChange={(e) => setForm({ ...form, user_id: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="add-city">City</Label>
              <Input
                id="add-city"
                placeholder="Lagos"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-state">State</Label>
              <Input
                id="add-state"
                placeholder="Lagos State"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="add-max">Max balance (₦)</Label>
            <Input
              id="add-max"
              type="number"
              min={1}
              placeholder="500000"
              value={form.max_balance}
              onChange={(e) => setForm({ ...form, max_balance: e.target.value })}
              required
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { reset(); onClose() }}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="size-4 animate-spin mr-1" />}
              Create agent
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Edit Agent Dialog ────────────────────────────────────────────────────────

function EditAgentDialog({
  agent,
  onClose,
  onSaved,
}: {
  agent: Agent | null
  onClose: () => void
  onSaved: (id: string, patch: Partial<Agent>) => void
}) {
  const [form, setForm] = useState({ city: "", state: "", max_balance: "", is_available: true })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (agent) {
      setForm({
        city:        agent.city,
        state:       agent.state,
        max_balance: String(agent.max_balance),
        is_available: agent.is_available,
      })
      setError("")
    }
  }, [agent])

  async function submit(e: React.SyntheticEvent) {
    e.preventDefault()
    if (!agent) return
    setError("")
    setLoading(true)
    try {
      const maxBalance = Number(form.max_balance)
      await apiClient.put(`/admin/agents/${agent.id}`, {
        city:        form.city.trim(),
        state:       form.state.trim(),
        max_balance: maxBalance,
        is_available: form.is_available,
      })
      onSaved(agent.id, {
        city:               form.city.trim(),
        state:              form.state.trim(),
        max_balance:        maxBalance,
        is_available:       form.is_available,
        balance_percentage: computePct(agent.cash_balance, maxBalance),
      })
      toast.success("Agent updated.")
      onClose()
    } catch (err) {
      setError(handleApiError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={!!agent} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit agent</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4 pt-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-city">City</Label>
              <Input
                id="edit-city"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-state">State</Label>
              <Input
                id="edit-state"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-max">Max balance (₦)</Label>
            <Input
              id="edit-max"
              type="number"
              min={1}
              value={form.max_balance}
              onChange={(e) => setForm({ ...form, max_balance: e.target.value })}
              required
            />
          </div>
          <div className="flex items-center justify-between py-1">
            <Label htmlFor="edit-avail" className="cursor-pointer">
              Available for deliveries
            </Label>
            <button
              id="edit-avail"
              type="button"
              role="switch"
              aria-checked={form.is_available}
              onClick={() => setForm((f) => ({ ...f, is_available: !f.is_available }))}
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                form.is_available ? "bg-green-600" : "bg-slate-300"
              )}
            >
              <span
                className={cn(
                  "inline-block size-4 rounded-full bg-white shadow transition-transform",
                  form.is_available ? "translate-x-6" : "translate-x-1"
                )}
              />
            </button>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="size-4 animate-spin mr-1" />}
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Top-up Dialog ────────────────────────────────────────────────────────────

function TopupDialog({
  agent,
  onClose,
  onTopped,
}: {
  agent: Agent | null
  onClose: () => void
  onTopped: (id: string, newBalance: number) => void
}) {
  const [amount, setAmount] = useState("")
  const [error, setError]   = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (agent) { setAmount(""); setError("") }
  }, [agent])

  async function submit(e: React.SyntheticEvent) {
    e.preventDefault()
    if (!agent) return
    setError("")
    setLoading(true)
    try {
      const res = await apiClient.post<{ message: string; cash_balance: number }>(
        `/admin/agents/${agent.id}/topup`,
        { amount: Number(amount) }
      )
      onTopped(agent.id, Number(res.data.cash_balance))
      toast.success("Balance topped up.")
      onClose()
    } catch (err) {
      setError(handleApiError(err))
    } finally {
      setLoading(false)
    }
  }

  const remaining = agent ? agent.max_balance - agent.cash_balance : 0

  return (
    <Dialog open={!!agent} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Top up float</DialogTitle>
        </DialogHeader>
        {agent && (
          <div className="bg-slate-50 rounded-lg px-4 py-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Current balance</span>
              <span className="font-medium">{fmt(agent.cash_balance)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Max balance</span>
              <span className="font-medium">{fmt(agent.max_balance)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-1">
              <span className="text-slate-500">Remaining capacity</span>
              <span className="font-semibold text-green-700">{fmt(remaining)}</span>
            </div>
          </div>
        )}
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="topup-amount">Amount to add (₦)</Label>
            <Input
              id="topup-amount"
              type="number"
              min={1}
              max={remaining}
              placeholder="50000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading || !amount}>
              {loading && <Loader2 className="size-4 animate-spin mr-1" />}
              Top up
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Remove Confirmation Dialog ───────────────────────────────────────────────

function RemoveDialog({
  agent,
  onClose,
  onRemoved,
}: {
  agent: Agent | null
  onClose: () => void
  onRemoved: (id: string) => void
}) {
  const [loading, setLoading] = useState(false)

  async function confirm() {
    if (!agent) return
    setLoading(true)
    try {
      await apiClient.delete(`/admin/agents/${agent.id}`)
      onRemoved(agent.id)
      toast.success("Agent removed.")
      onClose()
    } catch {
      toast.error("Failed to remove agent.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={!!agent} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Remove agent</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-600">
          Are you sure you want to remove{" "}
          <strong>{agent?.name ?? "this agent"}</strong>? They will be marked
          unavailable and soft-deleted.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={confirm} disabled={loading}>
            {loading && <Loader2 className="size-4 animate-spin mr-1" />}
            Remove
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminAgentsPage() {
  const [agents, setAgents]           = useState<Agent[]>([])
  const [loading, setLoading]         = useState(true)
  const [showAdd, setShowAdd]         = useState(false)
  const [editAgent, setEditAgent]     = useState<Agent | null>(null)
  const [topupAgent, setTopupAgent]   = useState<Agent | null>(null)
  const [removeAgent, setRemoveAgent] = useState<Agent | null>(null)

  useEffect(() => {
    apiClient
      .get<Agent[]>("/admin/agents")
      .then((r) => setAgents(r.data))
      .catch(() => toast.error("Failed to load agents."))
      .finally(() => setLoading(false))
  }, [])

  function handleCreated(agent: Agent) {
    setAgents((prev) => [agent, ...prev])
  }

  function handleSaved(id: string, patch: Partial<Agent>) {
    setAgents((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...patch } : a))
    )
  }

  function handleTopped(id: string, newBalance: number) {
    setAgents((prev) =>
      prev.map((a) =>
        a.id === id
          ? { ...a, cash_balance: newBalance, balance_percentage: computePct(newBalance, a.max_balance) }
          : a
      )
    )
  }

  function handleRemoved(id: string) {
    setAgents((prev) => prev.filter((a) => a.id !== id))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-sora text-slate-900">Agents</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {loading
              ? "Loading…"
              : `${agents.length} agent${agents.length !== 1 ? "s" : ""} registered`}
          </p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="gap-2">
          <Plus className="size-4" />
          Add agent
        </Button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
              <div className="flex justify-between">
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-3 w-28" />
              <div className="flex gap-2 pt-1 border-t border-slate-100">
                <Skeleton className="h-8 flex-1 rounded-lg" />
                <Skeleton className="h-8 flex-1 rounded-lg" />
                <Skeleton className="h-8 w-10 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : agents.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-slate-500 text-sm">No agents registered yet.</p>
          <Button onClick={() => setShowAdd(true)} className="mt-4 gap-2">
            <Plus className="size-4" /> Add first agent
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onEdit={setEditAgent}
              onTopup={setTopupAgent}
              onRemove={setRemoveAgent}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      <AddAgentDialog
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onCreated={handleCreated}
      />
      <EditAgentDialog
        agent={editAgent}
        onClose={() => setEditAgent(null)}
        onSaved={handleSaved}
      />
      <TopupDialog
        agent={topupAgent}
        onClose={() => setTopupAgent(null)}
        onTopped={handleTopped}
      />
      <RemoveDialog
        agent={removeAgent}
        onClose={() => setRemoveAgent(null)}
        onRemoved={handleRemoved}
      />
    </div>
  )
}