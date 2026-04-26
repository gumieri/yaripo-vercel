import { Trophy, Users, Target } from "lucide-react"
import { getTranslations } from "next-intl/server"

export default async function ManagePage() {
  const t = await getTranslations('Manage')

  return (
    <div className="flex flex-1 flex-col px-4 py-12">
      <h1 className="text-foreground text-2xl font-bold">{t('title')}</h1>
      <p className="text-muted-foreground mt-2">{t('overview')}</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="border-border/50 rounded-xl border bg-card p-6">
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Trophy className="h-5 w-5 text-primary" />
          </div>
          <p className="text-foreground text-2xl font-bold">0</p>
          <p className="text-muted-foreground mt-1 text-sm">{t('activeEvents')}</p>
        </div>
        <div className="border-border/50 rounded-xl border bg-card p-6">
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[oklch(0.72_0.15_240_/_0.1)]">
            <Target className="h-5 w-5 text-[oklch(0.72_0.15_240)]" />
          </div>
          <p className="text-foreground text-2xl font-bold">0</p>
          <p className="text-muted-foreground mt-1 text-sm">{t('configuredSectors')}</p>
        </div>
        <div className="border-border/50 rounded-xl border bg-card p-6">
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[oklch(0.68_0.22_310_/_0.1)]">
            <Users className="h-5 w-5 text-[oklch(0.68_0.22_310)]" />
          </div>
          <p className="text-foreground text-2xl font-bold">0</p>
          <p className="text-muted-foreground mt-1 text-sm">{t('registeredAthletes')}</p>
        </div>
      </div>
    </div>
  )
}
