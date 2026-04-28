"use client"

import { useState } from "react"
import { Mail, Loader2, Check } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "next-intl"

export function EmailForm() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const t = useTranslations()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return

    setLoading(true)
    try {
      const res = await fetch("/api/auth/signin/email", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ email, callbackUrl: "/" }),
      })

      if (res.ok) {
        setSent(true)
        toast.success(t("Login.emailSent"))
      } else {
        toast.error(t("Login.emailError"))
      }
    } catch {
      toast.error(t("Login.emailError"))
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="space-y-2 text-center">
        <div className="bg-primary/10 mx-auto flex h-12 w-12 items-center justify-center rounded-full">
          <Check className="text-primary h-6 w-6" />
        </div>
        <p className="text-foreground text-sm font-medium">{t("Login.checkEmail")}</p>
        <p className="text-muted-foreground text-xs">
          {t("Login.emailSentDesc")} <span className="font-medium">{email}</span>
        </p>
        <button
          type="button"
          onClick={() => setSent(false)}
          className="text-primary mt-2 text-xs hover:underline"
        >
          {t("Login.useAnotherEmail")}
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="relative">
        <label htmlFor="email" className="sr-only">
          {t("Login.emailPlaceholder")}
        </label>
        <Mail className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("Login.emailPlaceholder")}
          className="border-border bg-background text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:ring-primary/20 flex w-full rounded-lg border px-10 py-3 text-sm transition-colors outline-none focus:ring-2"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="bg-foreground hover:bg-foreground/80 text-background flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium transition-colors disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
        {loading ? t("Login.sending") : t("Login.email")}
      </button>
    </form>
  )
}
