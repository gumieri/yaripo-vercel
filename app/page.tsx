import Link from "next/link"
import { auth, signOut } from "@/lib/auth/server"

export default async function Home() {
  const session = await auth()

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-slate-200 bg-white">
        <nav className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Link href="/" className="text-2xl font-bold text-violet-600">
            Yaripo
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/events"
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Eventos
            </Link>
            <Link href="/gyms" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              Academias
            </Link>
            {session?.user ? (
              <div className="flex items-center gap-3">
                <Link
                  href="/judge"
                  className="text-sm font-medium text-slate-600 hover:text-slate-900"
                >
                  Juiz
                </Link>
                <Link
                  href="/athlete"
                  className="text-sm font-medium text-slate-600 hover:text-slate-900"
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
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    Sair
                  </button>
                </form>
              </div>
            ) : (
              <Link
                href="/login"
                className="rounded-lg bg-violet-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-violet-500"
              >
                Entrar
              </Link>
            )}
          </div>
        </nav>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-5xl font-extrabold tracking-tight text-slate-900 sm:text-6xl">
            Competicoes de escalada,{" "}
            <span className="bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent">
              simplificadas.
            </span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-slate-600">
            Gerencie competicoes de escalada com simplicidade e precisao. Rankings em tempo real,
            gerenciamento de filas e acompanhamento de desempenho.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link
              href="/events"
              className="rounded-full bg-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-violet-500"
            >
              Ver Eventos
            </Link>
            <Link
              href="/gyms"
              className="rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-violet-300 hover:text-violet-600"
            >
              Ver Academias
            </Link>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-8">
        <p className="text-center text-sm text-slate-500">
          Yaripo &mdash; Climbing Competition Platform
        </p>
      </footer>
    </div>
  )
}
