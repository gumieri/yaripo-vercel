import { auth } from "@/lib/auth/server"
import { db } from "@/lib/db"
import { eventJudgeInvitations, events, users, eventMembers } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { getTranslations } from "next-intl/server"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Mountain, Check, X, LogIn } from "lucide-react"

interface InvitationPageProps {
  params: {
    locale: string
    id: string
  }
}

export default async function InvitationPage({ params }: InvitationPageProps) {
  const session = await auth()
  const t = await getTranslations("Invitations")

  const invitation = await db
    .select({
      id: eventJudgeInvitations.id,
      status: eventJudgeInvitations.status,
      email: eventJudgeInvitations.email,
      eventId: eventJudgeInvitations.eventId,
      eventName: events.name,
      eventSlug: events.slug,
      organizerName: users.name,
    })
    .from(eventJudgeInvitations)
    .innerJoin(events, eq(eventJudgeInvitations.eventId, events.id))
    .innerJoin(users, eq(eventJudgeInvitations.invitedBy, users.id))
    .where(eq(eventJudgeInvitations.id, params.id))
    .then((rows) => rows[0])

  if (!invitation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="max-w-md p-8 text-center">
          <Mountain className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h1 className="text-foreground mb-2 text-2xl font-bold">{t("notFound")}</h1>
          <p className="text-muted-foreground">
            This invitation doesn't exist or has been deleted.
          </p>
        </Card>
      </div>
    )
  }

  const isForCurrentUser = session?.user?.email === invitation.email
  const isPending = invitation.status === "pending"

  if (!isPending) {
    const statusText = invitation.status === "accepted" ? t("accepted") : t("declined")
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="max-w-md p-8 text-center">
          <Mountain className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h1 className="text-foreground mb-2 text-2xl font-bold">{t("alreadyResponded")}</h1>
          <p className="text-muted-foreground">
            {t("alreadyResponded", { status: statusText })}
          </p>
        </Card>
      </div>
    )
  }

  const handleAccept = async () => {
    "use server"
    if (!session?.user?.id) {
      redirect(`/${params.locale}/login?callbackUrl=/${params.locale}/invitations/${params.id}`)
    }

    await db
      .update(eventJudgeInvitations)
      .set({ status: "accepted", updatedAt: new Date() })
      .where(eq(eventJudgeInvitations.id, params.id))

    await db.insert(eventMembers).values({
      eventId: invitation.eventId,
      userId: session.user.id,
      role: "judge",
    })

    redirect(`/${params.locale}/judge/${invitation.eventSlug}`)
  }

  const handleDecline = async () => {
    "use server"
    await db
      .update(eventJudgeInvitations)
      .set({ status: "declined", updatedAt: new Date() })
      .where(eq(eventJudgeInvitations.id, params.id))

    redirect(`/${params.locale}`)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full p-8">
        <div className="text-center">
          <Mountain className="mx-auto mb-4 h-12 w-12 text-primary" />
          <h1 className="text-foreground mb-2 text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground mb-6">
            {t("invitedBy", { organizer: invitation.organizerName })}
          </p>

          <div className="border-border mb-6 rounded-lg border bg-muted/50 p-4">
            <p className="text-muted-foreground text-sm">
              <span className="font-medium">{t("eventName")}:</span> {invitation.eventName}
            </p>
          </div>

          {session?.user ? (
            isForCurrentUser ? (
              <div className="flex gap-3">
                <form action={handleAccept} className="flex-1">
                  <Button type="submit" className="w-full" size="lg">
                    <Check className="mr-2 h-4 w-4" />
                    {t("accept")}
                  </Button>
                </form>
                <form action={handleDecline} className="flex-1">
                  <Button type="submit" variant="outline" className="w-full" size="lg">
                    <X className="mr-2 h-4 w-4" />
                    {t("decline")}
                  </Button>
                </form>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                This invitation is for {invitation.email}. Please sign in with that account.
              </p>
            )
          ) : (
            <div className="space-y-4">
              <p className="text-muted-foreground text-sm">{t("signInToAccept")}</p>
              <Button
                onClick={() => redirect(`/${params.locale}/login?callbackUrl=/${params.locale}/invitations/${params.id}`)}
                className="w-full"
                size="lg"
              >
                <LogIn className="mr-2 h-4 w-4" />
                Sign In
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}