import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  type AgendaEvent,
  defaultEventFormTimes,
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
} from "@/features/agenda/agenda-api"

const eventSchema = z
  .object({
    title: z.string().trim().min(1, "Titre requis").max(200),
    description: z.string().max(5000).optional(),
    location: z.string().max(255).optional(),
    url: z
      .string()
      .max(2048)
      .optional()
      .refine(
        (value) => !value?.trim() || /^https?:\/\//i.test(value.trim()),
        { message: "URL http(s) requise" },
      ),
    begin_at: z.string().min(1, "Début requis"),
    end_at: z.string().min(1, "Fin requise"),
  })
  .refine(
    (values) =>
      new Date(values.end_at).getTime() > new Date(values.begin_at).getTime(),
    {
      message: "La fin doit être après le début",
      path: ["end_at"],
    },
  )

export type EventFormValues = z.infer<typeof eventSchema>

export const EVENT_FORM_ID = "agenda-event-form"

type EventFormProps = {
  mode: "create" | "edit"
  initialEvent?: AgendaEvent | null
  defaultDay?: Date | null
  pending: boolean
  error: string | null
  onSubmit: (payload: {
    title: string
    description: string | null
    location: string | null
    url: string | null
    begin_at: string
    end_at: string
  }) => void
}

function valuesFromEvent(
  event?: AgendaEvent | null,
  defaultDay?: Date | null,
): EventFormValues {
  if (!event) {
    const defaults = defaultEventFormTimes(defaultDay ?? undefined)
    return {
      title: "",
      description: "",
      location: "",
      url: "",
      begin_at: defaults.begin_at,
      end_at: defaults.end_at,
    }
  }

  return {
    title: event.title,
    description: event.description ?? "",
    location: event.location ?? "",
    url: event.url ?? "",
    begin_at: toDatetimeLocalValue(event.begin_at),
    end_at: toDatetimeLocalValue(event.end_at),
  }
}

export function EventForm({
  mode,
  initialEvent,
  defaultDay = null,
  pending,
  error,
  onSubmit,
}: EventFormProps) {
  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: valuesFromEvent(initialEvent, defaultDay),
  })

  useEffect(() => {
    form.reset(valuesFromEvent(initialEvent, defaultDay))
  }, [form, initialEvent, defaultDay, mode])

  function handleSubmit(values: EventFormValues) {
    onSubmit({
      title: values.title.trim(),
      description: values.description?.trim() || null,
      location: values.location?.trim() || null,
      url: values.url?.trim() || null,
      begin_at: fromDatetimeLocalValue(values.begin_at),
      end_at: fromDatetimeLocalValue(values.end_at),
    })
  }

  return (
    <form
      id={EVENT_FORM_ID}
      className="flex flex-col gap-6"
      onSubmit={form.handleSubmit(handleSubmit)}
    >
      <FieldGroup>
        <Field data-invalid={Boolean(form.formState.errors.title)}>
          <FieldLabel htmlFor="event-title">Titre</FieldLabel>
          <Input
            id="event-title"
            placeholder="Study session libft"
            disabled={pending}
            aria-invalid={Boolean(form.formState.errors.title)}
            {...form.register("title")}
          />
          <FieldError>{form.formState.errors.title?.message}</FieldError>
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field data-invalid={Boolean(form.formState.errors.begin_at)}>
            <FieldLabel htmlFor="event-begin">Début</FieldLabel>
            <Input
              id="event-begin"
              type="datetime-local"
              disabled={pending}
              aria-invalid={Boolean(form.formState.errors.begin_at)}
              {...form.register("begin_at")}
            />
            <FieldError>{form.formState.errors.begin_at?.message}</FieldError>
          </Field>

          <Field data-invalid={Boolean(form.formState.errors.end_at)}>
            <FieldLabel htmlFor="event-end">Fin</FieldLabel>
            <Input
              id="event-end"
              type="datetime-local"
              disabled={pending}
              aria-invalid={Boolean(form.formState.errors.end_at)}
              {...form.register("end_at")}
            />
            <FieldError>{form.formState.errors.end_at?.message}</FieldError>
          </Field>
        </div>

        <Field data-invalid={Boolean(form.formState.errors.location)}>
          <FieldLabel htmlFor="event-location">Lieu (optionnel)</FieldLabel>
          <Input
            id="event-location"
            placeholder="Cluster · Salle B01"
            disabled={pending}
            aria-invalid={Boolean(form.formState.errors.location)}
            {...form.register("location")}
          />
          <FieldError>{form.formState.errors.location?.message}</FieldError>
        </Field>

        <Field data-invalid={Boolean(form.formState.errors.url)}>
          <FieldLabel htmlFor="event-url">Lien (optionnel)</FieldLabel>
          <Input
            id="event-url"
            type="url"
            placeholder="https://…"
            disabled={pending}
            aria-invalid={Boolean(form.formState.errors.url)}
            {...form.register("url")}
          />
          <FieldError>{form.formState.errors.url?.message}</FieldError>
        </Field>

        <Field data-invalid={Boolean(form.formState.errors.description)}>
          <FieldLabel htmlFor="event-description">
            Description (optionnel)
          </FieldLabel>
          <Textarea
            id="event-description"
            rows={4}
            placeholder="Markdown ok — **gras**, listes…"
            disabled={pending}
            aria-invalid={Boolean(form.formState.errors.description)}
            {...form.register("description")}
          />
          <FieldError>
            {form.formState.errors.description?.message}
          </FieldError>
        </Field>
      </FieldGroup>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  )
}
