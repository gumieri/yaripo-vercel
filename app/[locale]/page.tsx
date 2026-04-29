import { Link } from "@/i18n/routing"
import { auth, signOut } from "@/lib/auth/server"
import { Mountain } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { LanguageSwitcher } from "@/components/language-switcher"

export default async function Home() {
  const session = await auth()
  const t = await getTranslations()

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-border/50 bg-background/80 sticky top-0 z-50 border-b backdrop-blur-lg">
        <nav className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Link href="/" className="text-foreground flex items-center gap-2 text-xl font-bold">
            <Mountain className="text-primary h-6 w-6" />
            <span>
              Yari<span className="text-primary">po</span>
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <Link
              href="/events"
              className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
            >
              {t("Nav.events")}
            </Link>
            <Link
              href="/venues"
              className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
            >
              {t("Nav.venues")}
            </Link>
            {session?.user ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-3">
                  <Link
                    href="/manage"
                    className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
                  >
                    {t("Nav.manage")}
                  </Link>
                  <Link
                    href="/judge"
                    className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
                  >
                    {t("Nav.judge")}
                  </Link>
                  <Link
                    href="/athlete"
                    className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
                  >
                    {t("Nav.athlete")}
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
                      {t("Common.signOut")}
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <Link
                href="/login"
                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg px-4 py-1.5 text-sm font-medium transition-colors"
              >
                {t("Common.enter")}
              </Link>
            )}
          </div>
        </nav>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <div className="border-primary/20 bg-primary/10 text-primary mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium">
            <span className="relative flex h-2 w-2">
              <span className="bg-primary absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" />
              <span className="bg-primary relative inline-flex h-2 w-2 rounded-full" />
            </span>
            {t("Home.liveBadge")}
          </div>
          <h1 className="text-foreground text-5xl font-extrabold tracking-tight sm:text-6xl">
            {t("Home.title")}{" "}
            <span className="from-primary bg-gradient-to-r via-[oklch(0.72_0.15_240)] to-[oklch(0.68_0.22_310)] bg-clip-text text-transparent">
              {t("Home.titleHighlight")}
            </span>
          </h1>
          <p className="text-muted-foreground mt-6 text-lg leading-8">{t("Home.description")}</p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link
              href="/events"
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/20 hover:shadow-primary/30 rounded-full px-6 py-3 text-sm font-semibold shadow-lg transition-all"
            >
              {t("Home.viewEvents")}
            </Link>
            <Link
              href="/venues"
              className="border-border hover:border-primary/50 hover:text-primary text-muted-foreground rounded-full border px-6 py-3 text-sm font-semibold transition-colors"
            >
              {t("Home.viewVenues")}
            </Link>
          </div>

          <div className="border-border/50 divide-border/50 mt-20 grid grid-cols-3 divide-x">
            <div className="px-6 py-4 text-center">
              <p className="text-primary text-2xl font-bold">3</p>
              <p className="text-muted-foreground mt-1 text-xs font-medium tracking-wider uppercase">
                {t("Common.formats")}
              </p>
            </div>
            <div className="px-6 py-4 text-center">
              <p className="text-primary text-2xl font-bold">Live</p>
              <p className="text-muted-foreground mt-1 text-xs font-medium tracking-wider uppercase">
                {t("Common.liveRankings")}
              </p>
            </div>
            <div className="px-6 py-4 text-center">
              <p className="text-primary text-2xl font-bold">Zero</p>
              <p className="text-muted-foreground mt-1 text-xs font-medium tracking-wider uppercase">
                {t("Common.zeroSetup")}
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-border/50 border-t py-8">
        <p className="text-muted-foreground/60 text-center text-sm">{t("Home.footer")}</p>
      </footer>
    </div>
  )
}
