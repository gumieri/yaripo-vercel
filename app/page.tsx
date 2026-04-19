import Link from "next/link"
import { auth, signOut } from "@/lib/auth/server"
import { Mountain } from "lucide-react"

export default async function Home() {
  const session = await auth()

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-border/50 bg-background/80 backdrop-blur-lg sticky top-0 z-50 border-b">
        <nav className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold text-foreground">
            <Mountain className="h-6 w-6 text-primary" />
            <span>
              Yari<span className="text-primary">po</span>
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/events"
              className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
            >
              Eventos
            </Link>
            <Link
              href="/gyms"
              className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
            >
              Academias
            </Link>
            {session?.user ? (
              <div className="flex items-center gap-3">
                <Link
                  href="/judge"
                  className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
                >
                  Juiz
                </Link>
                <Link
                  href="/athlete"
                  className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
                >
                  Atleta
                </Link>
                <form
                  action={async () => {
                    "use server"
                    await signOut({ redirectTo: "/" })
                  }}
                >
                  <button
                    type="submit"
                    className="border-border hover:bg-secondary text-muted-foreground rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors"
                  >
                    Sair
                  </button>
                </form>
              </div>
            ) : (
              <Link
                href="/login"
                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg px-4 py-1.5 text-sm font-medium transition-colors"
              >
                Entrar
              </Link>
            )}
          </div>
        </nav>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            <span className="relative flex h-2 w-2">
              <span className="bg-primary absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" />
              <span className="bg-primary relative inline-flex h-2 w-2 rounded-full" />
            </span>
            Competições ao vivo
          </div>
          <h1 className="text-foreground text-5xl font-extrabold tracking-tight sm:text-6xl">
            Competições de escalada,{" "}
            <span className="bg-gradient-to-r from-primary via-[oklch(0.72_0.15_240)] to-[oklch(0.68_0.22_310)] bg-clip-text text-transparent">
              simplificadas.
            </span>
          </h1>
          <p className="text-muted-foreground mt-6 text-lg leading-8">
            Gerencie competições de escalada com simplicidade e precisão. Rankings em tempo real,
            gerenciamento de filas e acompanhamento de desempenho.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link
              href="/events"
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-6 py-3 text-sm font-semibold shadow-lg shadow-primary/20 transition-all hover:shadow-primary/30"
            >
              Ver Eventos
            </Link>
            <Link
              href="/gyms"
              className="border-border hover:border-primary/50 hover:text-primary text-muted-foreground rounded-full border px-6 py-3 text-sm font-semibold transition-colors"
            >
              Ver Academias
            </Link>
          </div>

          <div className="border-border/50 mt-20 grid grid-cols-3 divide-x divide-border/50">
            <div className="px-6 py-4 text-center">
              <p className="text-primary text-2xl font-bold">3</p>
              <p className="text-muted-foreground mt-1 text-xs font-medium uppercase tracking-wider">
                Formatos
              </p>
            </div>
            <div className="px-6 py-4 text-center">
              <p className="text-primary text-2xl font-bold">Live</p>
              <p className="text-muted-foreground mt-1 text-xs font-medium uppercase tracking-wider">
                Rankings
              </p>
            </div>
            <div className="px-6 py-4 text-center">
              <p className="text-primary text-2xl font-bold">Zero</p>
              <p className="text-muted-foreground mt-1 text-xs font-medium uppercase tracking-wider">
                Instalação
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-border/50 border-t py-8">
        <p className="text-muted-foreground/60 text-center text-sm">
          Yaripo &mdash; Climbing Competition Platform
        </p>
      </footer>
    </div>
  )
}
