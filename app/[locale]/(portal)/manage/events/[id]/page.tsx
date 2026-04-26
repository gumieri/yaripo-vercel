"use client"

import { useState } from "react"
import { use } from "react"
import { Link } from "@/i18n/routing"
import {
  useManageEvent,
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
import { useTranslations } from "next-intl"

import type { EventDetail, Category, Sector, Athlete } from "@/lib/api/hooks"

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
  const { data: event, isLoading } = useManageEvent(id)
  const [tab, setTab] = useState<Tab>("settings")
  const t = useTranslations('ManageEvent')

  if (isLoading || !event) {
    return <p className="text-muted-foreground p-4"><div className="space-y-2"><div className="h-4 w-24 animate-pulse rounded bg-secondary" /><div className="h-8 w-64 animate-pulse rounded bg-secondary" /><div className="h-64 w-full animate-pulse rounded-lg bg-secondary" /></div></p>
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "settings", label: t('settings') },
    { key: "categories", label: `${t('categories')} (${event.categories?.length || 0})` },
    { key: "sectors", label: `${t('sectors')} (${event.sectors?.length || 0})` },
    { key: "athletes", label: `${t('athletes')} (${event.athletes?.length || 0})` },
  ]

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/manage/events"
          className="text-muted-foreground hover:text-foreground text-sm"
        >
          &larr; {t('backToEvents')}
        </Link>
        <h1 className="text-foreground mt-2 text-2xl font-bold">{event.name}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{t('urlPreview', { slug: event.slug })}</p>
      </div>

      <div className="mb-6 flex gap-1 border-b">
        {tabs.map((tabItem) => (
<button
            key={tabItem.key}
            onClick={() => setTab(tabItem.key)}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              tab === tabItem.key
                ? "border-violet-600 text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tabItem.label}
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

function SettingsTab({ eventId, event }: { eventId: string; event: EventDetail }) {
  const updateEvent = useUpdateEvent()
  const t = useTranslations('ManageEvent')
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

  const statusOptions = ["draft", "published", "active", "completed", "archived"] as const

  const statusLabels: Record<string, string> = {
    draft: t('statusDraft'),
    published: t('statusPublished'),
    active: t('statusActive'),
    completed: t('statusCompleted'),
    archived: t('statusArchived'),
  }

  async function handleSave() {
    try {
      await updateEvent.mutateAsync({
        id: eventId,
        ...form,
        startsAt: form.startsAt || null,
        endsAt: form.endsAt || null,
        bestRoutesCount: form.bestRoutesCount !== "" ? Number(form.bestRoutesCount) : null,
      })
      toast.success(t('eventUpdated'))
    } catch (error: unknown) {
      if (error instanceof Error && 'code' in error && (error as { code: string }).code === "CONFLICT") {
        toast.error(t('slugExists'))
      } else {
        toast.error(t('updateError'))
      }
    }
  }

  return (
    <div className="max-w-lg space-y-4">
      <div>
        <label className="text-foreground mb-1 block text-sm font-medium">{t('name')}</label>
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="border-input bg-background text-foreground w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

       <div>
         <label className="text-foreground mb-1 block text-sm font-medium">{t('slug')}</label>
         <input
           value={form.slug}
           onChange={(e) => setForm({ ...form, slug: e.target.value })}
           className="border-input bg-background text-foreground w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
         />
         {form.slug && (
           <p className="text-muted-foreground mt-1 text-sm">
             {t('urlPreview', { slug: form.slug })}
           </p>
         )}
       </div>

      <div>
        <label className="text-foreground mb-1 block text-sm font-medium">{t('status')}</label>
        <select
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value })}
          className="border-input bg-background text-foreground w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {statusOptions.map((s) => (
            <option key={s} value={s}>
              {statusLabels[s]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-foreground mb-1 block text-sm font-medium">{t('format')}</label>
        <select
          value={form.scoringType}
          onChange={(e) => setForm({ ...form, scoringType: e.target.value })}
          className="border-input bg-background text-foreground w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="simple">{t('simple')}</option>
          <option value="ifsc">{t('ifsc')}</option>
          <option value="redpoint">{t('redpoint')}</option>
        </select>
      </div>

      {form.scoringType === "redpoint" && (
        <div>
          <label className="text-foreground mb-1 block text-sm font-medium">
            {t('bestRoutes')}
          </label>
          <input
            type="number"
            min={1}
            value={form.bestRoutesCount}
            onChange={(e) => setForm({ ...form, bestRoutesCount: e.target.value })}
            className="border-input bg-background text-foreground w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder={t('bestRoutesPlaceholder')}
          />
          <p className="text-muted-foreground mt-1 text-xs">
            {t('bestRoutesDesc')}
          </p>
        </div>
      )}

      <div>
        <label className="text-foreground mb-1 block text-sm font-medium">{t('description')}</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={3}
          className="border-input bg-background text-foreground w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-foreground mb-1 block text-sm font-medium">{t('start')}</label>
          <input
            type="datetime-local"
            value={form.startsAt}
            onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
            className="border-input bg-background text-foreground w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label className="text-foreground mb-1 block text-sm font-medium">{t('end')}</label>
          <input
            type="datetime-local"
            value={form.endsAt}
            onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
            className="border-input bg-background text-foreground w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      <Button
        onClick={handleSave}
        disabled={updateEvent.isPending}
        className="bg-primary hover:bg-primary/90"
      >
        {updateEvent.isPending ? t('saving') : t('save')}
      </Button>
    </div>
  )
}

function CategoriesTab({ eventId, event }: { eventId: string; event: EventDetail }) {
  const createCategory = useCreateCategory()
  const deleteCategory = useDeleteCategory()
  const t = useTranslations('ManageEvent')
  const [name, setName] = useState("")
  const [gender, setGender] = useState("open")
  const [minAge, setMinAge] = useState("")
  const [maxAge, setMaxAge] = useState("")

  const genderLabels: Record<string, string> = {
    male: t('genderMale'),
    female: t('genderFemale'),
    open: t('genderOpen'),
  }

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
      toast.success(t('categoryCreated'))
    } catch {
      toast.error(t('categoryCreateError'))
    }
  }

  async function handleDelete(catId: string, catName: string) {
    if (!confirm(t('deleteCategoryConfirm', { name: catName }))) return
    try {
      await deleteCategory.mutateAsync({ eventId, categoryId: catId })
      toast.success(t('categoryDeleted'))
    } catch {
      toast.error(t('deleteCategoryError'))
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-end gap-3">
        <div className="flex-1">
          <label className="text-foreground mb-1 block text-sm font-medium">{t('name')}</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            className="border-input bg-background text-foreground w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder={t('categoryPlaceholder')}
          />
        </div>
        <div>
          <label className="text-foreground mb-1 block text-sm font-medium">{t('gender')}</label>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className="border-input bg-background text-foreground w-full rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="open">{t('genderOpen')}</option>
            <option value="male">{t('genderMale')}</option>
            <option value="female">{t('genderFemale')}</option>
          </select>
        </div>
        <div className="w-20">
          <label className="text-foreground mb-1 block text-sm font-medium">{t('minAge')}</label>
          <input
            type="number"
            value={minAge}
            onChange={(e) => setMinAge(e.target.value)}
            className="border-input bg-background text-foreground w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="w-20">
          <label className="text-foreground mb-1 block text-sm font-medium">{t('maxAge')}</label>
          <input
            type="number"
            value={maxAge}
            onChange={(e) => setMaxAge(e.target.value)}
            className="border-input bg-background text-foreground w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <Button
          onClick={handleCreate}
          disabled={createCategory.isPending || !name.trim()}
          className="bg-primary hover:bg-primary/90"
        >
          {t('add')}
        </Button>
      </div>

      {!event.categories?.length ? (
        <p className="text-muted-foreground text-sm">{t('noCategories')}</p>
      ) : (
        <div className="space-y-2">
          {event.categories.map((cat: Category) => (
            <div key={cat.id} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-foreground font-medium">{cat.name}</p>
                <p className="text-muted-foreground text-xs">
                  {genderLabels[cat.gender] || cat.gender}
                  {cat.minAge != null && cat.maxAge != null && ` | ${cat.minAge}-${cat.maxAge} ${t('years')}`}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:bg-destructive/10"
                onClick={() => handleDelete(cat.id, cat.name)}
                disabled={deleteCategory.isPending}
              >
                {t('delete')}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SectorsTab({ eventId, event }: { eventId: string; event: EventDetail }) {
  const createSector = useCreateSector()
  const deleteSector = useDeleteSector()
  const updateSector = useUpdateSector()
  const t = useTranslations('ManageEvent')
  const [name, setName] = useState("")
  const isRedpoint = event.scoringType === "redpoint"

  async function handleCreate() {
    if (!name.trim()) return
    try {
      const payload: { eventId: string; [key: string]: unknown } = {
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
      toast.success(t('sectorCreated'))
    } catch {
      toast.error(t('sectorCreateError'))
    }
  }

  async function handleDelete(sectorId: string, sectorName: string) {
    if (!confirm(t('deleteSectorConfirm', { name: sectorName }))) return
    try {
      await deleteSector.mutateAsync({ eventId, sectorId })
      toast.success(t('sectorDeleted'))
    } catch {
      toast.error(t('deleteSectorError'))
    }
  }

  async function handleUpdateSector(sectorId: string, updates: Record<string, unknown>) {
    try {
      await updateSector.mutateAsync({ eventId, sectorId, ...updates })
    } catch {
      toast.error(t('sectorUpdateError'))
    }
  }

  const inputCls =
    "border-input bg-background text-foreground w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"

  return (
    <div>
      <div className="mb-4 flex items-end gap-3">
        <div className="flex-1">
          <label className="text-foreground mb-1 block text-sm font-medium">{t('sectorName')}</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            className={inputCls}
            placeholder={t('sectorPlaceholder')}
          />
        </div>
        <Button
          onClick={handleCreate}
          disabled={createSector.isPending || !name.trim()}
          className="bg-primary hover:bg-primary/90"
        >
          {t('add')}
        </Button>
      </div>

      {!event.sectors?.length ? (
        <p className="text-muted-foreground text-sm">{t('noSectors')}</p>
      ) : (
        <div className="space-y-2">
          {event.sectors.map((sector: Sector, idx: number) => (
            <div key={sector.id} className="rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-sm font-bold">
                    {idx + 1}
                  </span>
                  <p className="text-foreground font-medium">{sector.name}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => handleDelete(sector.id, sector.name)}
                  disabled={deleteSector.isPending}
                >
                  {t('delete')}
                </Button>
              </div>
              {isRedpoint && (
                <div className="mt-3 grid grid-cols-3 gap-3 pl-11">
                  <div>
                    <label className="text-muted-foreground mb-1 block text-xs">{t('flashPoints')}</label>
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
                    <label className="text-muted-foreground mb-1 block text-xs">{t('pointsPerAttempt')}</label>
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
                    <label className="text-muted-foreground mb-1 block text-xs">{t('maxAttempts')}</label>
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

function AthletesTab({ eventId, event }: { eventId: string; event: EventDetail }) {
  const createAthlete = useCreateAthlete()
  const bulkCreateAthletes = useBulkCreateAthletes()
  const deleteAthlete = useDeleteAthlete()
  const t = useTranslations('ManageEvent')
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
      toast.success(t('athleteRegistered'))
    } catch {
      toast.error(t('athleteRegisterError'))
    }
  }

  async function handleBulkCreate() {
    if (!bulkCategory) {
      toast.error(t('selectCategoryError'))
      return
    }
    const names = bulkNames
      .split("\n")
      .map((n) => n.trim())
      .filter(Boolean)
    if (names.length === 0) {
      toast.error(t('enterAtLeastOneName'))
      return
    }
    try {
      const result = await bulkCreateAthletes.mutateAsync({
        eventId,
        categoryId: bulkCategory,
        names,
      })
      setBulkNames("")
      toast.success(`${result.count} ${t('athleteRegistered')}`)
    } catch {
      toast.error(t('bulkRegisterError'))
    }
  }

  async function handleDelete(athleteId: string, athleteName: string) {
    if (!confirm(t('deleteAthleteConfirm', { name: athleteName }))) return
    try {
      await deleteAthlete.mutateAsync({ eventId, athleteId })
      toast.success(t('athleteDeleted'))
    } catch {
      toast.error(t('deleteAthleteError'))
    }
  }

  function getCategoryName(catId: string) {
    return categories.find((c: Category) => c.id === catId)?.name || catId
  }

  return (
    <div>
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setShowBulk(false)}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            !showBulk
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t('individual')}
        </button>
        <button
          onClick={() => setShowBulk(true)}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            showBulk
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t('bulk')}
        </button>
      </div>

      {!showBulk ? (
        <div className="mb-4 flex items-end gap-3">
          <div className="flex-1">
            <label className="text-foreground mb-1 block text-sm font-medium">{t('athleteName')}</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateSingle()}
              className="border-input bg-background text-foreground w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder={t('athletePlaceholder')}
            />
          </div>
          <div className="w-48">
            <label className="text-foreground mb-1 block text-sm font-medium">{t('category')}</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="border-input bg-background text-foreground w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">{t('selectCategory')}</option>
              {categories.map((cat: Category) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <Button
            onClick={handleCreateSingle}
            disabled={createAthlete.isPending || !name.trim() || !selectedCategory}
            className="bg-primary hover:bg-primary/90"
          >
            {t('add')}
          </Button>
        </div>
      ) : (
        <div className="mb-4 space-y-3">
          <div className="w-48">
            <label className="text-foreground mb-1 block text-sm font-medium">{t('category')}</label>
            <select
              value={bulkCategory}
              onChange={(e) => setBulkCategory(e.target.value)}
              className="border-input bg-background text-foreground w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">{t('selectCategory')}</option>
              {categories.map((cat: Category) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-foreground mb-1 block text-sm font-medium">
              {t('namesOnePerLine')}
            </label>
            <textarea
              value={bulkNames}
              onChange={(e) => setBulkNames(e.target.value)}
              rows={6}
              className="border-input bg-background text-foreground w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder={t('namesPlaceholder')}
            />
          </div>
          <Button
            onClick={handleBulkCreate}
            disabled={
              bulkCreateAthletes.isPending || !bulkCategory || !bulkNames.trim()
            }
            className="bg-primary hover:bg-primary/90"
          >
            {bulkCreateAthletes.isPending ? t('registering') : t('registerBulk')}
          </Button>
        </div>
      )}

      {!event.athletes?.length ? (
        <p className="text-muted-foreground text-sm">{t('noAthletes')}</p>
      ) : (
        <div className="space-y-1">
          {event.athletes.map((athlete: Athlete) => (
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
                className="text-destructive hover:bg-destructive/10"
                onClick={() => handleDelete(athlete.id, athlete.name)}
                disabled={deleteAthlete.isPending}
              >
                {t('remove')}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
