"use client"

import { useState } from "react"
import { use } from "react"
import Link from "next/link"
import {
  useAdminEvent,
  useUpdateEvent,
  useCreateCategory,
  useDeleteCategory,
  useCreateSector,
  useUpdateSector,
  useDeleteSector,
  useCreateAthlete,
  useBulkCreateAthletes,
  useDeleteAthlete,
} from "@/lib/api/hooks"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

const statusLabels: Record<string, string> = {
  draft: "Rascunho",
  published: "Publicado",
  active: "Em andamento",
  completed: "Finalizado",
  archived: "Arquivado",
}

const statusOptions = ["draft", "published", "active", "completed", "archived"] as const

const genderLabels: Record<string, string> = {
  male: "Masculino",
  female: "Feminino",
  open: "Aberto",
}

type Tab = "settings" | "categories" | "sectors" | "athletes"

function formatLocalDatetime(dateStr: string): string {
  const d = new Date(dateStr)
  const offset = d.getTimezoneOffset()
  const local = new Date(d.getTime() - offset * 60_000)
  return local.toISOString().slice(0, 16)
}

export default function AdminEventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { data: event, isLoading } = useAdminEvent(id)
  const [tab, setTab] = useState<Tab>("settings")

  if (isLoading || !event) {
    return <p className="text-muted-foreground p-4">Carregando...</p>
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "settings", label: "Configuracoes" },
    { key: "categories", label: `Categorias (${event.categories?.length || 0})` },
    { key: "sectors", label: `Setores (${event.sectors?.length || 0})` },
    { key: "athletes", label: `Atletas (${event.athletes?.length || 0})` },
  ]

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/events"
          className="text-muted-foreground hover:text-foreground text-sm"
        >
          &larr; Voltar para eventos
        </Link>
        <h1 className="text-foreground mt-2 text-2xl font-bold">{event.name}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{event.slug}</p>
      </div>

      <div className="mb-6 flex gap-1 border-b">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? "border-violet-600 text-violet-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "settings" && <SettingsTab eventId={id} event={event} />}
      {tab === "categories" && <CategoriesTab eventId={id} event={event} />}
      {tab === "sectors" && <SectorsTab eventId={id} event={event} />}
      {tab === "athletes" && <AthletesTab eventId={id} event={event} />}
    </div>
  )
}

function SettingsTab({ eventId, event }: { eventId: string; event: any }) {
  const updateEvent = useUpdateEvent()
  const [form, setForm] = useState({
    name: event.name,
    slug: event.slug,
    scoringType: event.scoringType,
    description: event.description || "",
    startsAt: event.startsAt ? formatLocalDatetime(event.startsAt) : "",
    endsAt: event.endsAt ? formatLocalDatetime(event.endsAt) : "",
    status: event.status,
    bestRoutesCount: event.bestRoutesCount ?? "",
  })

  async function handleSave() {
    try {
      await updateEvent.mutateAsync({
        id: eventId,
        ...form,
        startsAt: form.startsAt || null,
        endsAt: form.endsAt || null,
        bestRoutesCount: form.bestRoutesCount !== "" ? Number(form.bestRoutesCount) : null,
      })
      toast.success("Evento atualizado")
    } catch (error: any) {
      if (error?.code === "CONFLICT") {
        toast.error("Slug ja existe")
      } else {
        toast.error("Erro ao atualizar")
      }
    }
  }

  return (
    <div className="max-w-lg space-y-4">
      <div>
        <label className="text-foreground mb-1 block text-sm font-medium">Nome</label>
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
        />
      </div>

      <div>
        <label className="text-foreground mb-1 block text-sm font-medium">Slug</label>
        <input
          value={form.slug}
          onChange={(e) => setForm({ ...form, slug: e.target.value })}
          className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
        />
      </div>

      <div>
        <label className="text-foreground mb-1 block text-sm font-medium">Status</label>
        <select
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value })}
          className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
        >
          {statusOptions.map((s) => (
            <option key={s} value={s}>
              {statusLabels[s]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-foreground mb-1 block text-sm font-medium">Formato</label>
        <select
          value={form.scoringType}
          onChange={(e) => setForm({ ...form, scoringType: e.target.value })}
          className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
        >
          <option value="simple">Simples</option>
          <option value="ifsc">IFSC</option>
          <option value="redpoint">Redpoint</option>
        </select>
      </div>

      {form.scoringType === "redpoint" && (
        <div>
          <label className="text-foreground mb-1 block text-sm font-medium">
            Melhores Rotas (vazio = todas)
          </label>
          <input
            type="number"
            min={1}
            value={form.bestRoutesCount}
            onChange={(e) => setForm({ ...form, bestRoutesCount: e.target.value })}
            className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            placeholder="Ex: 5"
          />
          <p className="text-muted-foreground mt-1 text-xs">
            Numero de rotas que contam para a pontuacao total. Deixe vazio para contar todas.
          </p>
        </div>
      )}

      <div>
        <label className="text-foreground mb-1 block text-sm font-medium">Descricao</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={3}
          className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-foreground mb-1 block text-sm font-medium">Inicio</label>
          <input
            type="datetime-local"
            value={form.startsAt}
            onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
            className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
        </div>
        <div>
          <label className="text-foreground mb-1 block text-sm font-medium">Fim</label>
          <input
            type="datetime-local"
            value={form.endsAt}
            onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
            className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
        </div>
      </div>

      <Button
        onClick={handleSave}
        disabled={updateEvent.isPending}
        className="bg-violet-600 hover:bg-violet-500"
      >
        {updateEvent.isPending ? "Salvando..." : "Salvar"}
      </Button>
    </div>
  )
}

function CategoriesTab({ eventId, event }: { eventId: string; event: any }) {
  const createCategory = useCreateCategory()
  const deleteCategory = useDeleteCategory()
  const [name, setName] = useState("")
  const [gender, setGender] = useState("open")
  const [minAge, setMinAge] = useState("")
  const [maxAge, setMaxAge] = useState("")

  async function handleCreate() {
    if (!name.trim()) return
    try {
      await createCategory.mutateAsync({
        eventId,
        name: name.trim(),
        gender,
        minAge: minAge ? Number(minAge) : null,
        maxAge: maxAge ? Number(maxAge) : null,
      })
      setName("")
      toast.success("Categoria criada")
    } catch {
      toast.error("Erro ao criar categoria")
    }
  }

  async function handleDelete(catId: string, catName: string) {
    if (!confirm(`Excluir categoria "${catName}"? Atletas vinculados serao removidos.`)) return
    try {
      await deleteCategory.mutateAsync({ eventId, categoryId: catId })
      toast.success("Categoria excluida")
    } catch {
      toast.error("Erro ao excluir")
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-end gap-3">
        <div className="flex-1">
          <label className="text-foreground mb-1 block text-sm font-medium">Nome</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            placeholder="Ex: Masculino 18-29"
          />
        </div>
        <div>
          <label className="text-foreground mb-1 block text-sm font-medium">Genero</label>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className="border-input bg-background rounded-lg border px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          >
            <option value="open">Aberto</option>
            <option value="male">Masculino</option>
            <option value="female">Feminino</option>
          </select>
        </div>
        <div className="w-20">
          <label className="text-foreground mb-1 block text-sm font-medium">Idade min</label>
          <input
            type="number"
            value={minAge}
            onChange={(e) => setMinAge(e.target.value)}
            className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
        </div>
        <div className="w-20">
          <label className="text-foreground mb-1 block text-sm font-medium">Idade max</label>
          <input
            type="number"
            value={maxAge}
            onChange={(e) => setMaxAge(e.target.value)}
            className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
        </div>
        <Button
          onClick={handleCreate}
          disabled={createCategory.isPending || !name.trim()}
          className="bg-violet-600 hover:bg-violet-500"
        >
          Adicionar
        </Button>
      </div>

      {!event.categories?.length ? (
        <p className="text-muted-foreground text-sm">Nenhuma categoria criada.</p>
      ) : (
        <div className="space-y-2">
          {event.categories.map((cat: any) => (
            <div key={cat.id} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-foreground font-medium">{cat.name}</p>
                <p className="text-muted-foreground text-xs">
                  {genderLabels[cat.gender] || cat.gender}
                  {cat.minAge != null && cat.maxAge != null && ` | ${cat.minAge}-${cat.maxAge} anos`}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:bg-red-50"
                onClick={() => handleDelete(cat.id, cat.name)}
                disabled={deleteCategory.isPending}
              >
                Excluir
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SectorsTab({ eventId, event }: { eventId: string; event: any }) {
  const createSector = useCreateSector()
  const deleteSector = useDeleteSector()
  const updateSector = useUpdateSector()
  const [name, setName] = useState("")
  const isRedpoint = event.scoringType === "redpoint"

  async function handleCreate() {
    if (!name.trim()) return
    try {
      const payload: { eventId: string; [key: string]: any } = {
        eventId,
        name: name.trim(),
        orderIndex: (event.sectors?.length || 0),
      }
      if (isRedpoint) {
        payload.flashPoints = 1000
        payload.pointsPerAttempt = 100
        payload.maxAttempts = 5
      }
      await createSector.mutateAsync(payload)
      setName("")
      toast.success("Setor criado")
    } catch {
      toast.error("Erro ao criar setor")
    }
  }

  async function handleDelete(sectorId: string, sectorName: string) {
    if (!confirm(`Excluir setor "${sectorName}"? Filas e tentativas serao removidas.`)) return
    try {
      await deleteSector.mutateAsync({ eventId, sectorId })
      toast.success("Setor excluido")
    } catch {
      toast.error("Erro ao excluir")
    }
  }

  async function handleUpdateSector(sectorId: string, updates: Record<string, any>) {
    try {
      await updateSector.mutateAsync({ eventId, sectorId, ...updates })
    } catch {
      toast.error("Erro ao atualizar setor")
    }
  }

  const inputCls =
    "border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"

  return (
    <div>
      <div className="mb-4 flex items-end gap-3">
        <div className="flex-1">
          <label className="text-foreground mb-1 block text-sm font-medium">Nome do Setor</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            className={inputCls}
            placeholder="Ex: Bloco A"
          />
        </div>
        <Button
          onClick={handleCreate}
          disabled={createSector.isPending || !name.trim()}
          className="bg-violet-600 hover:bg-violet-500"
        >
          Adicionar
        </Button>
      </div>

      {!event.sectors?.length ? (
        <p className="text-muted-foreground text-sm">Nenhum setor criado.</p>
      ) : (
        <div className="space-y-2">
          {event.sectors.map((sector: any, idx: number) => (
            <div key={sector.id} className="rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm font-bold">
                    {idx + 1}
                  </span>
                  <p className="text-foreground font-medium">{sector.name}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:bg-red-50"
                  onClick={() => handleDelete(sector.id, sector.name)}
                  disabled={deleteSector.isPending}
                >
                  Excluir
                </Button>
              </div>
              {isRedpoint && (
                <div className="mt-3 grid grid-cols-3 gap-3 pl-11">
                  <div>
                    <label className="text-muted-foreground mb-1 block text-xs">Flash (pts)</label>
                    <input
                      type="number"
                      min={0}
                      defaultValue={sector.flashPoints ?? 1000}
                      onBlur={(e) =>
                        handleUpdateSector(sector.id, { flashPoints: Number(e.target.value) || 1000 })
                      }
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="text-muted-foreground mb-1 block text-xs">Pts/tentativa</label>
                    <input
                      type="number"
                      min={0}
                      defaultValue={sector.pointsPerAttempt ?? 100}
                      onBlur={(e) =>
                        handleUpdateSector(sector.id, { pointsPerAttempt: Number(e.target.value) || 100 })
                      }
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="text-muted-foreground mb-1 block text-xs">Max tentativas</label>
                    <input
                      type="number"
                      min={1}
                      defaultValue={sector.maxAttempts ?? 5}
                      onBlur={(e) =>
                        handleUpdateSector(sector.id, { maxAttempts: Number(e.target.value) || 5 })
                      }
                      className={inputCls}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AthletesTab({ eventId, event }: { eventId: string; event: any }) {
  const createAthlete = useCreateAthlete()
  const bulkCreateAthletes = useBulkCreateAthletes()
  const deleteAthlete = useDeleteAthlete()
  const [name, setName] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("")
  const [bulkNames, setBulkNames] = useState("")
  const [bulkCategory, setBulkCategory] = useState("")
  const [showBulk, setShowBulk] = useState(false)

  const categories = event.categories || []

  async function handleCreateSingle() {
    if (!name.trim() || !selectedCategory) return
    try {
      await createAthlete.mutateAsync({
        eventId,
        name: name.trim(),
        categoryId: selectedCategory,
      })
      setName("")
      toast.success("Atleta registrado")
    } catch {
      toast.error("Erro ao registrar atleta")
    }
  }

  async function handleBulkCreate() {
    if (!bulkCategory) {
      toast.error("Selecione uma categoria")
      return
    }
    const names = bulkNames
      .split("\n")
      .map((n) => n.trim())
      .filter(Boolean)
    if (names.length === 0) {
      toast.error("Insira ao menos um nome")
      return
    }
    try {
      const result = await bulkCreateAthletes.mutateAsync({
        eventId,
        categoryId: bulkCategory,
        names,
      })
      setBulkNames("")
      toast.success(`${result.count} atletas registrados`)
    } catch {
      toast.error("Erro ao registrar atletas")
    }
  }

  async function handleDelete(athleteId: string, athleteName: string) {
    if (!confirm(`Excluir atleta "${athleteName}"?`)) return
    try {
      await deleteAthlete.mutateAsync({ eventId, athleteId })
      toast.success("Atleta removido")
    } catch {
      toast.error("Erro ao remover")
    }
  }

  function getCategoryName(catId: string) {
    return categories.find((c: any) => c.id === catId)?.name || catId
  }

  return (
    <div>
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setShowBulk(false)}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            !showBulk
              ? "bg-violet-100 text-violet-700"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Individual
        </button>
        <button
          onClick={() => setShowBulk(true)}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            showBulk
              ? "bg-violet-100 text-violet-700"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Lote
        </button>
      </div>

      {!showBulk ? (
        <div className="mb-4 flex items-end gap-3">
          <div className="flex-1">
            <label className="text-foreground mb-1 block text-sm font-medium">Nome do Atleta</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateSingle()}
              className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              placeholder="Ex: Joao Silva"
            />
          </div>
          <div className="w-48">
            <label className="text-foreground mb-1 block text-sm font-medium">Categoria</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            >
              <option value="">Selecionar...</option>
              {categories.map((cat: any) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <Button
            onClick={handleCreateSingle}
            disabled={createAthlete.isPending || !name.trim() || !selectedCategory}
            className="bg-violet-600 hover:bg-violet-500"
          >
            Adicionar
          </Button>
        </div>
      ) : (
        <div className="mb-4 space-y-3">
          <div className="w-48">
            <label className="text-foreground mb-1 block text-sm font-medium">Categoria</label>
            <select
              value={bulkCategory}
              onChange={(e) => setBulkCategory(e.target.value)}
              className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            >
              <option value="">Selecionar...</option>
              {categories.map((cat: any) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-foreground mb-1 block text-sm font-medium">
              Nomes (um por linha)
            </label>
            <textarea
              value={bulkNames}
              onChange={(e) => setBulkNames(e.target.value)}
              rows={6}
              className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              placeholder={"Joao Silva\nMaria Santos\nPedro Lima"}
            />
          </div>
          <Button
            onClick={handleBulkCreate}
            disabled={
              bulkCreateAthletes.isPending || !bulkCategory || !bulkNames.trim()
            }
            className="bg-violet-600 hover:bg-violet-500"
          >
            {bulkCreateAthletes.isPending ? "Registrando..." : "Registrar Lote"}
          </Button>
        </div>
      )}

      {!event.athletes?.length ? (
        <p className="text-muted-foreground text-sm">Nenhum atleta registrado.</p>
      ) : (
        <div className="space-y-1">
          {event.athletes.map((athlete: any) => (
            <div
              key={athlete.id}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div>
                <p className="text-foreground text-sm font-medium">{athlete.name}</p>
                <p className="text-muted-foreground text-xs">
                  {getCategoryName(athlete.categoryId)}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:bg-red-50"
                onClick={() => handleDelete(athlete.id, athlete.name)}
                disabled={deleteAthlete.isPending}
              >
                Remover
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
