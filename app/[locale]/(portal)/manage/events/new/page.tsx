"use client"

import { useRouter, Link } from "@/i18n/routing"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useCreateEvent, useManageVenues } from "@/lib/api/hooks"
import type { VenueSummary } from "@/lib/api/hooks"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useState } from "react"
import { useTranslations } from "next-intl"

const eventSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with dashes only"),
  venueId: z.string().optional(),
  scoringType: z.enum(["simple", "ifsc", "redpoint"]),
  description: z.string().optional(),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
})

type EventForm = z.infer<typeof eventSchema>

const inputCls =
  "border-input bg-background text-foreground w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"

export default function NewEventPage() {
  const router = useRouter()
  const createEvent = useCreateEvent()
  const { data: venues } = useManageVenues()
  const [slugPreview, setSlugPreview] = useState("")
  const t = useTranslations("Manage")

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EventForm>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      scoringType: "simple",
    },
  })

  async function onSubmit(data: EventForm) {
    try {
      const result = await createEvent.mutateAsync(data)
      toast.success(t("createSuccess"))
      router.push(`/manage/events/${result.id}`)
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        "code" in error &&
        (error as { code: string }).code === "CONFLICT"
      ) {
        toast.error(t("slugExists"))
      } else {
        toast.error(t("createError"))
      }
    }
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/manage/events"
          className="text-muted-foreground hover:text-foreground text-sm transition-colors"
        >
          &larr; {t("backToEvents")}
        </Link>
        <h1 className="text-foreground mt-2 text-2xl font-bold">{t("newEvent")}</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="max-w-lg space-y-4">
        <div>
          <label className="text-foreground mb-1 block text-sm font-medium">{t("name")}</label>
          <input {...register("name")} className={inputCls} placeholder={t("namePlaceholder")} />
          {errors.name && <p className="text-destructive mt-1 text-sm">{errors.name.message}</p>}
        </div>

        <div>
          <label className="text-foreground mb-1 block text-sm font-medium">{t("slug")}</label>
          <input
            {...register("slug", {
              onChange: (e) => setSlugPreview(e.target.value),
            })}
            className={inputCls}
            placeholder={t("slugPlaceholder")}
          />
          {slugPreview && (
            <p className="text-muted-foreground mt-1 text-sm">
              {t("slugPreview", { slug: slugPreview })}
            </p>
          )}
          {errors.slug && <p className="text-destructive mt-1 text-sm">{errors.slug.message}</p>}
        </div>

        <div>
          <label className="text-foreground mb-1 block text-sm font-medium">{t("venue")}</label>
          <select {...register("venueId")} className={inputCls}>
            <option value="">{t("noVenue")}</option>
            {venues?.map((venue: VenueSummary) => (
              <option key={venue.id} value={venue.id}>
                {venue.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-foreground mb-1 block text-sm font-medium">{t("format")}</label>
          <select {...register("scoringType")} className={inputCls}>
            <option value="simple">{t("simpleFormat")}</option>
            <option value="ifsc">{t("ifscFormat")}</option>
            <option value="redpoint">{t("redpointFormat")}</option>
          </select>
        </div>

        <div>
          <label className="text-foreground mb-1 block text-sm font-medium">
            {t("description")}
          </label>
          <textarea {...register("description")} rows={3} className={inputCls} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-foreground mb-1 block text-sm font-medium">{t("start")}</label>
            <input {...register("startsAt")} type="datetime-local" className={inputCls} />
          </div>
          <div>
            <label className="text-foreground mb-1 block text-sm font-medium">{t("end")}</label>
            <input {...register("endsAt")} type="datetime-local" className={inputCls} />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={createEvent.isPending}>
            {createEvent.isPending ? t("creating") : t("create")}
          </Button>
          <Link href="/manage/events">
            <Button type="button" variant="outline">
              {t("cancel")}
            </Button>
          </Link>
        </div>
      </form>
    </div>
  )
}
