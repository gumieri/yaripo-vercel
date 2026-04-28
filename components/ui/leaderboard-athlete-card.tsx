import { Button } from "./button"
import { cn } from "@/lib/utils/cn"

interface LeaderboardAthleteCardProps {
  rank: number
  name: string
  category?: string
  score: number
  onRegisterTop?: () => void
  isTop?: boolean
}

export function LeaderboardAthleteCard({
  rank,
  name,
  category,
  score,
  onRegisterTop,
  isTop = false,
}: LeaderboardAthleteCardProps) {
  const isTopRank = rank <= 3

  return (
    <div
      className={cn(
        "bg-card relative flex items-center gap-4 rounded-lg border p-4 transition-all hover:shadow-md",
        isTopRank && "border-primary/30 shadow-sm",
      )}
    >
      {isTopRank && (
        <div className="from-primary/5 absolute inset-0 -z-10 rounded-lg bg-gradient-to-r to-transparent" />
      )}

      <div
        className={cn(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold tabular-nums",
          isTopRank ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
        )}
      >
        {rank}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <h3 className="text-foreground truncate text-base font-semibold">{name}</h3>
          {category && (
            <span className="bg-muted text-muted-foreground shrink-0 rounded-full px-2 py-0.5 text-xs font-medium">
              {category}
            </span>
          )}
        </div>
        <p className="text-muted-foreground text-sm">{score} pts</p>
      </div>

      <Button
        variant={isTop ? "secondary" : "default"}
        size="lg"
        onClick={onRegisterTop}
        className="min-h-[44px] min-w-[120px] shrink-0"
      >
        {isTop ? "TOP" : "Registrar"}
      </Button>
    </div>
  )
}
