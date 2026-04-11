export interface RoutePoints {
  sectorId: string
  points: number
  attemptCount: number
}

export function calculateRoutePoints(params: {
  flashPoints: number
  pointsPerAttempt: number
  maxAttempts: number
  attemptCount: number
  isTop: boolean
}): number {
  if (!params.isTop) return 0
  if (params.attemptCount > params.maxAttempts) return 0
  return Math.max(params.flashPoints - (params.attemptCount - 1) * params.pointsPerAttempt, 0)
}

export function selectBestRoutes(
  routeScores: RoutePoints[],
  bestRoutesCount: number | null,
): RoutePoints[] {
  const sorted = [...routeScores].sort((a, b) => b.points - a.points)
  if (bestRoutesCount === null) return sorted
  return sorted.slice(0, bestRoutesCount)
}

export interface ScoreSummary {
  totalPoints: number
  flashCount: number
  totalAttempts: number
}

export function calculateScoreSummary(
  routeScores: RoutePoints[],
  bestRoutesCount: number | null,
): ScoreSummary {
  const best = selectBestRoutes(routeScores, bestRoutesCount)
  return {
    totalPoints: best.reduce((sum, r) => sum + r.points, 0),
    flashCount: best.filter((r) => r.attemptCount === 1).length,
    totalAttempts: best.reduce((sum, r) => sum + r.attemptCount, 0),
  }
}
