"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useCreateEvent, useManageGyms } from "@/lib/api/hooks"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useState } from "react"

const eventSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  slug: z
    .string()
    .min(1, "Slug obrigatório")
    .regex(/^[a-z0-9-]+$/, "Apenas minúsculas, números e hífens"),
  gymId: z.string().optional(),
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
  const { data: gyms } = useManageGyms()
  const [slugPreview, setSlugPreview] = useState("")

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
      toast.success("Evento criado")
      router.push(`/manage/events/${result.id}`)
    } catch (error: any) {
      if (error?.code === "CONFLICT") {
        toast.error("Slug já existe")
      } else {
        toast.error("Erro ao criar evento")
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
          &larr; Voltar para eventos
        </Link>
        <h1 className="text-foreground mt-2 text-2xl font-bold">Novo Evento</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="max-w-lg space-y-4">
        <div>
          <label className="text-foreground mb-1 block text-sm font-medium">Nome</label>
           <input
             {...register("name")}
             className={inputCls}
             placeholder="Boulder Open 2026"
           />
           {errors.name && <p className="mt-1 text-sm text-destructive">{errors.name.message}</p>}
         </div>

         <div>
            <label className="text-foreground mb-1 block text-sm font-medium">Link Único do Evento</label>
            <input
              {...register("slug", {
                onChange: (e) => setSlugPreview(e.target.value),
              })}
              className={inputCls}
              placeholder="boulder-open-2026"
            />
            {slugPreview && (
              <p className="text-muted-foreground mt-1 text-sm">
                yaripo.app/events/{slugPreview}
              </p>
            )}
           {errors.slug && <p className="mt-1 text-sm text-destructive">{errors.slug.message}</p>}
         </div>

         <div>
            <label className="text-foreground mb-1 block text-sm font-medium">Ginásio (opcional)</label>
           <select {...register("gymId")} className={inputCls}>
             <option value="">Nenhuma</option>
             {gyms?.map((gym: any) => (
               <option key={gym.id} value={gym.id}>
                 {gym.name}
               </option>
             ))}
           </select>
         </div>

        <div>
          <label className="text-foreground mb-1 block text-sm font-medium">Formato</label>
          <select {...register("scoringType")} className={inputCls}>
            <option value="simple">Simples (tops + tentativas)</option>
            <option value="ifsc">IFSC (tops + zonas + tentativas)</option>
            <option value="redpoint">Redpoint (pontos por rota)</option>
          </select>
        </div>

        <div>
          <label className="text-foreground mb-1 block text-sm font-medium">Descrição</label>
          <textarea {...register("description")} rows={3} className={inputCls} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-foreground mb-1 block text-sm font-medium">Início</label>
            <input {...register("startsAt")} type="datetime-local" className={inputCls} />
          </div>
          <div>
            <label className="text-foreground mb-1 block text-sm font-medium">Fim</label>
            <input {...register("endsAt")} type="datetime-local" className={inputCls} />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={createEvent.isPending}>
            {createEvent.isPending ? "Criando..." : "Criar Evento"}
          </Button>
          <Link href="/manage/events">
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </Link>
        </div>
      </form>
    </div>
  )
}
