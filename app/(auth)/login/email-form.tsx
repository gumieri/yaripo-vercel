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
      const res = await fetch("/api/auth/signin/nodemailer", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ email, callbackUrl: "/" }),
      })

      if (res.ok) {
        setSent(true)
        toast.success("Email enviado! Verifique sua caixa de entrada.")
      } else {
        toast.error("Erro ao enviar email. Tente novamente.")
      }
    } catch {
      toast.error("Erro ao enviar email. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="text-center space-y-2">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Check className="h-6 w-6 text-primary" />
        </div>
        <p className="text-foreground text-sm font-medium">Verifique seu email</p>
        <p className="text-muted-foreground text-xs">
          Enviamos um link de acesso para <span className="font-medium">{email}</span>
        </p>
        <button
          type="button"
          onClick={() => setSent(false)}
          className="text-primary hover:underline text-xs mt-2"
        >
          Usar outro email
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="relative">
        <Mail className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
          className="border-border bg-background text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:ring-primary/20 flex w-full rounded-lg border px-10 py-3 text-sm outline-none transition-colors focus:ring-2"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="bg-foreground hover:bg-foreground/80 text-background disabled:opacity-50 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium transition-colors"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Mail className="h-4 w-4" />
        )}
        {loading ? "Enviando..." : t('Login.email')}
      </button>
    </form>
  )
}
