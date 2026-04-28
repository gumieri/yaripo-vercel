"use client"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
      <h2 className="text-foreground text-xl font-semibold">Something went wrong</h2>
      <p className="text-muted-foreground text-sm">{error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
      >
        Try again
      </button>
    </div>
  )
}
