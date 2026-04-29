"use client"

import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useCreateVenue } from "@/lib/api/hooks"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { cn } from "@/lib/utils/cn"
import { Building2, Trees, Globe as GlobeIcon, MapPin } from "lucide-react"

const venueFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200, "Name too long"),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .max(100, "Slug too long")
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with dashes only"),
  type: z.enum(["gym", "outdoor", "public", "other"]),
  city: z.string().trim().max(100, "City too long").nullish(),
  state: z.string().trim().max(100, "State too long").nullish(),
  country: z.string().trim().max(100, "Country too long"),
})

type VenueForm = z.infer<typeof venueFormSchema>

const venueTypeIcons: Record<string, React.ReactNode> = {
  gym: <Building2 className="h-5 w-5" />,
  outdoor: <Trees className="h-5 w-5" />,
  public: <GlobeIcon className="h-5 w-5" />,
  other: <MapPin className="h-5 w-5" />,
}

interface InlineVenueFormProps {
  country: string
  open: boolean
  onClose: () => void
  onSuccess: (venueId: string) => void
}

export function InlineVenueForm({ country, open, onClose, onSuccess }: InlineVenueFormProps) {
  const createVenue = useCreateVenue()
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<VenueForm>({
    resolver: zodResolver(venueFormSchema),
    defaultValues: {
      country: country.toUpperCase(),
      type: "gym",
    },
  })

  const nameValue = watch("name")

  async function onSubmit(data: VenueForm) {
    try {
      const result = await createVenue.mutateAsync(data)
      toast.success("Venue created successfully")
      onSuccess(result.id)
      onClose()
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        "code" in error &&
        (error as { code: string }).code === "CONFLICT"
      ) {
        toast.error("A venue with this slug already exists")
      } else {
        toast.error("Error creating venue. Please try again.")
      }
    }
  }

  const updateSlug = (name: string) => {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
    setValue("slug", slug)
  }

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Register New Venue</SheetTitle>
          <SheetDescription>Create a new venue for your competition</SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
          <div>
            <label className="text-foreground mb-1 block text-sm font-medium">Country</label>
            <div className="border-input bg-muted flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
              <GlobeIcon className="text-muted-foreground h-4 w-4" />
              <span>{country.toUpperCase()}</span>
            </div>
          </div>

          <div>
            <label className="text-foreground mb-1 block text-sm font-medium">Venue name *</label>
            <Input
              {...register("name", { onChange: (e) => updateSlug(e.target.value) })}
              placeholder="Ex: Boulder Gym São Paulo"
              className={cn(errors.name && "border-destructive")}
            />
            {errors.name && <p className="text-destructive mt-1 text-xs">{errors.name.message}</p>}
          </div>

          <div>
            <label className="text-foreground mb-1 block text-sm font-medium">Slug *</label>
            <Input
              {...register("slug")}
              placeholder="boulder-gym-sao-paulo"
              className={cn(errors.slug && "border-destructive")}
            />
            {errors.slug && <p className="text-destructive mt-1 text-xs">{errors.slug.message}</p>}
          </div>

          <div>
            <label className="text-foreground mb-1 block text-sm font-medium">Venue type</label>
            <div className="grid grid-cols-2 gap-2">
              {(["gym", "outdoor", "public", "other"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setValue("type", type)}
                  className={cn(
                    "border-input hover:bg-accent flex items-center gap-2 rounded-md border px-3 py-2 text-sm",
                    watch("type") === type && "bg-accent border-primary",
                  )}
                >
                  {venueTypeIcons[type]}
                  <span className="capitalize">{type}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-foreground mb-1 block text-sm font-medium">City</label>
              <Input {...register("city")} placeholder="São Paulo" />
              {errors.city && (
                <p className="text-destructive mt-1 text-xs">{errors.city.message}</p>
              )}
            </div>
            <div>
              <label className="text-foreground mb-1 block text-sm font-medium">State</label>
              <Input {...register("state")} placeholder="SP" />
              {errors.state && (
                <p className="text-destructive mt-1 text-xs">{errors.state.message}</p>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? "Creating..." : "Create Venue"}
            </Button>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
