import { describe, it, expect } from "vitest"
import {
  calculateRoutePoints,
  selectBestRoutes,
  calculateScoreSummary,
  type RoutePoints,
} from "@/lib/scoring/redpoint"

describe("calculateRoutePoints", () => {
  it("flash = full points", () => {
    expect(
      calculateRoutePoints({ flashPoints: 1000, pointsPerAttempt: 100, maxAttempts: 5, attemptCount: 1, isTop: true }),
    ).toBe(1000)
  })

  it("2nd attempt top = flashPoints - penalty", () => {
    expect(
      calculateRoutePoints({ flashPoints: 1000, pointsPerAttempt: 100, maxAttempts: 5, attemptCount: 2, isTop: true }),
    ).toBe(900)
  })

  it("5th attempt top = flashPoints - 4*penalty", () => {
    expect(
      calculateRoutePoints({ flashPoints: 1000, pointsPerAttempt: 100, maxAttempts: 5, attemptCount: 5, isTop: true }),
    ).toBe(600)
  })

  it("no top = 0", () => {
    expect(
      calculateRoutePoints({ flashPoints: 1000, pointsPerAttempt: 100, maxAttempts: 5, attemptCount: 3, isTop: false }),
    ).toBe(0)
  })

  it("attempt exceeds maxAttempts = 0", () => {
    expect(
      calculateRoutePoints({ flashPoints: 1000, pointsPerAttempt: 100, maxAttempts: 5, attemptCount: 6, isTop: true }),
    ).toBe(0)
  })

  it("points floor at 0", () => {
    expect(
      calculateRoutePoints({ flashPoints: 100, pointsPerAttempt: 200, maxAttempts: 5, attemptCount: 5, isTop: true }),
    ).toBe(0)
  })

  it("exactly at maxAttempts = valid", () => {
    expect(
      calculateRoutePoints({ flashPoints: 1000, pointsPerAttempt: 100, maxAttempts: 3, attemptCount: 3, isTop: true }),
    ).toBe(800)
  })

  it("custom flashPoints and penalty", () => {
    expect(
      calculateRoutePoints({ flashPoints: 500, pointsPerAttempt: 50, maxAttempts: 10, attemptCount: 3, isTop: true }),
    ).toBe(400)
  })

  it("penalty 0 means all tops get full points", () => {
    expect(
      calculateRoutePoints({ flashPoints: 1000, pointsPerAttempt: 0, maxAttempts: 10, attemptCount: 5, isTop: true }),
    ).toBe(1000)
  })
})

describe("selectBestRoutes", () => {
  const routes: RoutePoints[] = [
    { sectorId: "a", points: 1000, attemptCount: 1 },
    { sectorId: "b", points: 800, attemptCount: 2 },
    { sectorId: "c", points: 600, attemptCount: 3 },
    { sectorId: "d", points: 200, attemptCount: 5 },
    { sectorId: "e", points: 0, attemptCount: 6 },
  ]

  it("bestRoutesCount=null returns all", () => {
    const result = selectBestRoutes(routes, null)
    expect(result).toHaveLength(5)
  })

  it("bestRoutesCount=3 returns top 3", () => {
    const result = selectBestRoutes(routes, 3)
    expect(result).toHaveLength(3)
    expect(result.map((r) => r.sectorId)).toEqual(["a", "b", "c"])
  })

  it("bestRoutesCount > actual routes returns all", () => {
    const result = selectBestRoutes(routes, 10)
    expect(result).toHaveLength(5)
  })

  it("bestRoutesCount=0 returns empty", () => {
    const result = selectBestRoutes(routes, 0)
    expect(result).toHaveLength(0)
  })

  it("sorts by points descending", () => {
    const unsorted: RoutePoints[] = [
      { sectorId: "c", points: 600, attemptCount: 3 },
      { sectorId: "a", points: 1000, attemptCount: 1 },
      { sectorId: "b", points: 800, attemptCount: 2 },
    ]
    const result = selectBestRoutes(unsorted, null)
    expect(result[0].sectorId).toBe("a")
    expect(result[1].sectorId).toBe("b")
    expect(result[2].sectorId).toBe("c")
  })

  it("does not mutate input", () => {
    const input: RoutePoints[] = [
      { sectorId: "b", points: 800, attemptCount: 2 },
      { sectorId: "a", points: 1000, attemptCount: 1 },
    ]
    const copy = [...input]
    selectBestRoutes(input, 1)
    expect(input).toEqual(copy)
  })
})

describe("calculateScoreSummary", () => {
  it("sums all route points when bestRoutesCount=null", () => {
    const routes: RoutePoints[] = [
      { sectorId: "a", points: 1000, attemptCount: 1 },
      { sectorId: "b", points: 800, attemptCount: 2 },
      { sectorId: "c", points: 600, attemptCount: 3 },
    ]
    const result = calculateScoreSummary(routes, null)
    expect(result.totalPoints).toBe(2400)
    expect(result.flashCount).toBe(1)
    expect(result.totalAttempts).toBe(6)
  })

  it("sums only best N routes", () => {
    const routes: RoutePoints[] = [
      { sectorId: "a", points: 1000, attemptCount: 1 },
      { sectorId: "b", points: 800, attemptCount: 2 },
      { sectorId: "c", points: 600, attemptCount: 3 },
      { sectorId: "d", points: 0, attemptCount: 10 },
    ]
    const result = calculateScoreSummary(routes, 3)
    expect(result.totalPoints).toBe(2400)
    expect(result.flashCount).toBe(1)
    expect(result.totalAttempts).toBe(6)
  })

  it("flashCount counts only attemptCount=1 in best N", () => {
    const routes: RoutePoints[] = [
      { sectorId: "a", points: 1000, attemptCount: 1 },
      { sectorId: "b", points: 900, attemptCount: 1 },
      { sectorId: "c", points: 800, attemptCount: 2 },
    ]
    const result = calculateScoreSummary(routes, null)
    expect(result.flashCount).toBe(2)
  })

  it("totalAttempts sums attemptCount of best N only", () => {
    const routes: RoutePoints[] = [
      { sectorId: "a", points: 1000, attemptCount: 1 },
      { sectorId: "b", points: 800, attemptCount: 2 },
      { sectorId: "c", points: 0, attemptCount: 10 },
    ]
    const result = calculateScoreSummary(routes, 2)
    expect(result.totalAttempts).toBe(3)
  })

  it("empty routes returns zero summary", () => {
    const result = calculateScoreSummary([], null)
    expect(result).toEqual({ totalPoints: 0, flashCount: 0, totalAttempts: 0 })
  })

  it("all zero-point routes", () => {
    const routes: RoutePoints[] = [
      { sectorId: "a", points: 0, attemptCount: 5 },
      { sectorId: "b", points: 0, attemptCount: 6 },
    ]
    const result = calculateScoreSummary(routes, null)
    expect(result.totalPoints).toBe(0)
    expect(result.flashCount).toBe(0)
    expect(result.totalAttempts).toBe(11)
  })
})
