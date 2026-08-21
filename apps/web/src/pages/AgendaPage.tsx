import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns"
import { fr } from "date-fns/locale"
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ChevronRightIcon,
  ExternalLink,
  KeyRound,
  MessageCircle,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  UserRound,
  CalendarDays,
} from "lucide-react"
import { useMemo, useState } from "react"
import { Link } from "react-router-dom"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { EmptyState } from "@/components/EmptyState"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { getCurrentUser } from "@/features/auth/auth-api"
import {
  type AgendaEvent,
  agendaListQueryKey,
  agendaQueryKey,
  createEvent,
  deleteEvent,
  eventLocalDateKey,
  listAgenda,
  localDateKey,
  updateEvent,
} from "@/features/agenda/agenda-api"
import { ApiKeysDrawer } from "@/features/agenda/ApiKeysDrawer"
import {
  EVENT_FORM_ID,
  EventForm,
} from "@/features/agenda/EventForm"
import { EventMarkdown } from "@/features/agenda/EventMarkdown"
import { getInitials } from "@/features/profile/profile-display"
import { getApiErrorMessage, resolveMediaUrl } from "@/lib/api"
import { cn } from "@/lib/utils"

type FormMode =
  | { type: "closed" }
  | { type: "create"; day: Date }
  | { type: "edit"; event: AgendaEvent }
type DrawerStep = "list" | "detail"

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]

function formatTimeRange(beginAt: string | null, endAt: string | null) {
  if (!beginAt) return "Heure à confirmer"
  const begin = new Date(beginAt)
  const start = new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(begin)
  if (!endAt) return start
  const end = new Date(endAt)
  if (Number.isNaN(end.getTime())) return start
  const finish = new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(end)
  return `${start} – ${finish}`
}

function monthGridDays(month: Date) {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 })
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 })
  return eachDayOfInterval({ start, end })
}

function groupEventsByDay(events: AgendaEvent[]) {
  const map = new Map<string, AgendaEvent[]>()
  for (const event of events) {
    const key = eventLocalDateKey(event.begin_at)
    if (!key) continue
    const bucket = map.get(key) ?? []
    bucket.push(event)
    map.set(key, bucket)
  }
  for (const bucket of map.values()) {
    bucket.sort((a, b) => {
      const aTime = a.begin_at ? new Date(a.begin_at).getTime() : 0
      const bTime = b.begin_at ? new Date(b.begin_at).getTime() : 0
      return aTime - bTime
    })
  }
  return map
}

export function AgendaPage() {
  const queryClient = useQueryClient()
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()))
  const [selectedDay, setSelectedDay] = useState(() => startOfDay(new Date()))
  const [dayDrawerOpen, setDayDrawerOpen] = useState(false)
  const [drawerStep, setDrawerStep] = useState<DrawerStep>("list")
  const [selectedEvent, setSelectedEvent] = useState<AgendaEvent | null>(null)
  const [formMode, setFormMode] = useState<FormMode>({ type: "closed" })
  const [apiKeysOpen, setApiKeysOpen] = useState(false)

  const currentUserRequest = useQuery({
    queryKey: ["auth", "me"],
    queryFn: getCurrentUser,
  })

  const gridDays = useMemo(() => monthGridDays(visibleMonth), [visibleMonth])

  const listParams = useMemo(() => {
    const begin = startOfDay(gridDays[0])
    const end = startOfDay(gridDays[gridDays.length - 1])
    end.setDate(end.getDate() + 1)
    return {
      begin_at: begin.toISOString(),
      end_at: end.toISOString(),
      limit: 200,
    }
  }, [gridDays])

  const agendaRequest = useQuery({
    queryKey: agendaListQueryKey(listParams),
    queryFn: () => listAgenda(listParams),
  })

  const createRequest = useMutation({
    mutationFn: createEvent,
    onSuccess: async () => {
      setFormMode({ type: "closed" })
      await queryClient.invalidateQueries({ queryKey: agendaQueryKey })
      await queryClient.invalidateQueries({ queryKey: ["dashboard", "events"] })
    },
  })

  const updateRequest = useMutation({
    mutationFn: ({
      eventId,
      payload,
    }: {
      eventId: number
      payload: Parameters<typeof updateEvent>[1]
    }) => updateEvent(eventId, payload),
    onSuccess: async () => {
      setFormMode({ type: "closed" })
      setDayDrawerOpen(false)
      setSelectedEvent(null)
      setDrawerStep("list")
      await queryClient.invalidateQueries({ queryKey: agendaQueryKey })
      await queryClient.invalidateQueries({ queryKey: ["dashboard", "events"] })
    },
  })

  const deleteRequest = useMutation({
    mutationFn: deleteEvent,
    onSuccess: async () => {
      setSelectedEvent(null)
      setDrawerStep("list")
      await queryClient.invalidateQueries({ queryKey: agendaQueryKey })
      await queryClient.invalidateQueries({ queryKey: ["dashboard", "events"] })
    },
  })

  const eventsByDay = useMemo(
    () => groupEventsByDay(agendaRequest.data?.items ?? []),
    [agendaRequest.data?.items],
  )

  const selectedKey = localDateKey(selectedDay)
  const selectedEvents = eventsByDay.get(selectedKey) ?? []
  const monthLabel = format(visibleMonth, "MMMM yyyy", { locale: fr })
  const selectedLabel = format(selectedDay, "EEEE d MMMM", { locale: fr })

  const listError = getApiErrorMessage(agendaRequest.error)
  const formError =
    getApiErrorMessage(createRequest.error)
    ?? getApiErrorMessage(updateRequest.error)
  const formPending = createRequest.isPending || updateRequest.isPending

  function goToday() {
    const today = startOfDay(new Date())
    setVisibleMonth(startOfMonth(today))
    setSelectedDay(today)
  }

  function openDayDrawer(day: Date) {
    setSelectedDay(startOfDay(day))
    setSelectedEvent(null)
    setDrawerStep("list")
    setDayDrawerOpen(true)
  }

  function openCreate(day: Date = selectedDay) {
    setDayDrawerOpen(false)
    setSelectedDay(startOfDay(day))
    setFormMode({ type: "create", day: startOfDay(day) })
  }

  function openEdit(event: AgendaEvent) {
    setDayDrawerOpen(false)
    setFormMode({ type: "edit", event })
  }

  function closeForm() {
    createRequest.reset()
    updateRequest.reset()
    setFormMode({ type: "closed" })
  }

  function handleDelete(event: AgendaEvent) {
    if (event.source !== "betterintra" || !event.can_edit) return
    const eventId = Number.parseInt(event.external_id, 10)
    if (!Number.isFinite(eventId)) return
    if (!window.confirm(`Supprimer « ${event.title} » ?`)) return
    deleteRequest.mutate(eventId)
  }

  function handleDayDrawerOpenChange(open: boolean) {
    setDayDrawerOpen(open)
    if (!open) {
      setDrawerStep("list")
      setSelectedEvent(null)
    }
  }

  function handleFormDrawerOpenChange(open: boolean) {
    if (!open) closeForm()
  }

  const formOpen = formMode.type !== "closed"

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight capitalize">
            {monthLabel}
          </h1>
          <p className="text-sm text-muted-foreground">
            Clique un jour pour ouvrir ses events.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToday}>
            Aujourd’hui
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setVisibleMonth((current) => addMonths(current, -1))}
          >
            <ChevronLeft />
            <span className="sr-only">Mois précédent</span>
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setVisibleMonth((current) => addMonths(current, 1))}
          >
            <ChevronRight />
            <span className="sr-only">Mois suivant</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setApiKeysOpen(true)}
          >
            <KeyRound data-icon="inline-start" />
            Clés API
          </Button>
          <Button size="sm" onClick={() => openCreate()}>
            <Plus data-icon="inline-start" />
            Créer
          </Button>
        </div>
      </div>

      {listError && (
        <p role="alert" className="text-sm text-destructive">
          {listError}
        </p>
      )}

      <Card className="overflow-hidden py-0">
        <CardContent className="p-0">
          <div className="grid grid-cols-7 border-b bg-muted/40">
            {WEEKDAYS.map((label) => (
              <div
                key={label}
                className="border-r px-2 py-2 text-center text-xs font-medium text-muted-foreground last:border-r-0"
              >
                {label}
              </div>
            ))}
          </div>

          {agendaRequest.isPending ? (
            <p className="p-6 text-sm text-muted-foreground">
              Chargement du calendrier…
            </p>
          ) : (
            <div className="grid grid-cols-7 items-stretch">
              {gridDays.map((day) => {
                const key = localDateKey(day)
                const dayEvents = eventsByDay.get(key) ?? []
                const inMonth = isSameMonth(day, visibleMonth)
                const selected =
                  dayDrawerOpen && isSameDay(day, selectedDay)
                const today = isToday(day)

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => openDayDrawer(day)}
                    className={cn(
                      "flex h-full min-h-24 flex-col gap-1 border-r border-b p-1.5 text-left transition-colors last:border-r-0 hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none",
                      !inMonth && "bg-muted/20 text-muted-foreground",
                      selected && "bg-accent/60 ring-1 ring-inset ring-ring",
                    )}
                  >
                    <div className="flex items-center justify-between gap-1 px-0.5">
                      <span
                        className={cn(
                          "inline-flex size-6 items-center justify-center rounded-full text-xs font-medium",
                          today && "bg-primary text-primary-foreground",
                        )}
                      >
                        {format(day, "d")}
                      </span>
                      {dayEvents.length > 0 && (
                        <span className="text-[10px] text-muted-foreground tabular-nums">
                          {dayEvents.length}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col gap-0.5">
                      {dayEvents.map((event) => (
                        <span
                          key={event.id}
                          title={event.title}
                          className="truncate rounded-sm bg-secondary px-1 py-0.5 text-[10px] leading-tight text-secondary-foreground sm:text-[11px]"
                        >
                          {event.begin_at
                            ? `${format(new Date(event.begin_at), "HH:mm")} `
                            : ""}
                          {event.title}
                        </span>
                      ))}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Drawer
        open={dayDrawerOpen}
        onOpenChange={handleDayDrawerOpenChange}
        swipeDirection="right"
      >
        <DrawerContent className="data-[swipe-axis=x]:w-full data-[swipe-axis=x]:sm:max-w-md">
          {drawerStep === "list" || !selectedEvent ? (
            <>
              <DrawerHeader>
                <DrawerTitle className="capitalize">{selectedLabel}</DrawerTitle>
                <DrawerDescription>
                  {selectedEvents.length === 0
                    ? "Aucun event ce jour-là."
                    : `${selectedEvents.length} event${selectedEvents.length > 1 ? "s" : ""}`}
                </DrawerDescription>
              </DrawerHeader>

              <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-4">
                {selectedEvents.length === 0 ? (
                  <EmptyState
                    icon={CalendarDays}
                    title="Aucun event"
                    description="Crée un event pour cette journée."
                  />
                ) : (
                  <ul className="flex flex-col gap-2">
                    {selectedEvents.map((event) => (
                      <li key={event.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedEvent(event)
                            setDrawerStep("detail")
                          }}
                          className="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">
                              {event.title}
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {formatTimeRange(event.begin_at, event.end_at)}
                            </p>
                          </div>
                          <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <DrawerFooter>
                <Button onClick={() => openCreate(selectedDay)}>
                  <Plus data-icon="inline-start" />
                  Ajouter un event
                </Button>
                <DrawerClose render={<Button variant="outline" />}>
                  Fermer
                </DrawerClose>
              </DrawerFooter>
            </>
          ) : (
            <>
              <DrawerHeader>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mb-1 w-fit"
                  onClick={() => {
                    setDrawerStep("list")
                    setSelectedEvent(null)
                  }}
                >
                  <ArrowLeft data-icon="inline-start" />
                  Retour à la liste
                </Button>
                <DrawerTitle>{selectedEvent.title}</DrawerTitle>
                <DrawerDescription>
                  {formatTimeRange(
                    selectedEvent.begin_at,
                    selectedEvent.end_at,
                  )}
                </DrawerDescription>
              </DrawerHeader>

              <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
                {(selectedEvent.kind || selectedEvent.can_edit) && (
                  <div className="flex flex-wrap gap-2">
                    {selectedEvent.kind && (
                      <Badge variant="outline">{selectedEvent.kind}</Badge>
                    )}
                    {selectedEvent.can_edit && (
                      <Badge variant="default">À toi</Badge>
                    )}
                  </div>
                )}

                {selectedEvent.creator && (
                  <div className="flex items-center gap-3 rounded-lg border p-3">
                    <Avatar>
                      <AvatarImage
                        src={resolveMediaUrl(selectedEvent.creator.avatar_url)}
                        alt=""
                      />
                      <AvatarFallback>
                        {getInitials(
                          selectedEvent.creator.display_name
                            ?? selectedEvent.creator.login
                            ?? "?",
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">Créé par</p>
                      <p className="truncate font-medium">
                        {selectedEvent.creator.display_name
                          ?? selectedEvent.creator.login
                          ?? `User #${selectedEvent.creator.id}`}
                      </p>
                      {selectedEvent.creator.login && (
                        <p className="truncate text-sm text-muted-foreground">
                          @{selectedEvent.creator.login}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col gap-2">
                      {selectedEvent.creator.login && (
                        <Button
                          variant="outline"
                          size="sm"
                          render={
                            <Link
                              to={`/profile/${encodeURIComponent(selectedEvent.creator.login)}`}
                              onClick={() => setDayDrawerOpen(false)}
                            />
                          }
                        >
                          <UserRound data-icon="inline-start" />
                          Profil
                        </Button>
                      )}
                      {selectedEvent.creator.login
                        && selectedEvent.creator.is_intra_linked
                        && selectedEvent.creator.id
                          !== currentUserRequest.data?.id && (
                        <Button
                          variant="outline"
                          size="sm"
                          render={
                            <Link
                              to={`/conversations?to=${encodeURIComponent(selectedEvent.creator.login)}`}
                              onClick={() => setDayDrawerOpen(false)}
                            />
                          }
                        >
                          <MessageCircle data-icon="inline-start" />
                          Message
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {selectedEvent.location?.trim() && (
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="size-3.5 shrink-0" />
                    <span>{selectedEvent.location}</span>
                  </p>
                )}

                {selectedEvent.description?.trim() ? (
                  <EventMarkdown content={selectedEvent.description} />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Pas de description.
                  </p>
                )}
              </div>

              <DrawerFooter>
                {selectedEvent.url?.startsWith("http://") ||
                selectedEvent.url?.startsWith("https://") ? (
                  <Button
                    variant="outline"
                    render={
                      <a
                        href={selectedEvent.url}
                        target="_blank"
                        rel="noreferrer"
                      />
                    }
                  >
                    <ExternalLink data-icon="inline-start" />
                    Ouvrir
                  </Button>
                ) : null}
                {selectedEvent.can_edit && (
                  <>
                    <Button onClick={() => openEdit(selectedEvent)}>
                      <Pencil data-icon="inline-start" />
                      Modifier
                    </Button>
                    <Button
                      variant="destructive"
                      disabled={deleteRequest.isPending}
                      onClick={() => handleDelete(selectedEvent)}
                    >
                      <Trash2 data-icon="inline-start" />
                      Supprimer
                    </Button>
                  </>
                )}
                <DrawerClose render={<Button variant="outline" />}>
                  Fermer
                </DrawerClose>
              </DrawerFooter>
            </>
          )}
        </DrawerContent>
      </Drawer>

      <Drawer
        open={formOpen}
        onOpenChange={handleFormDrawerOpenChange}
        swipeDirection="right"
      >
        <DrawerContent className="data-[swipe-axis=x]:w-full data-[swipe-axis=x]:sm:max-w-md">
          <DrawerHeader>
            <DrawerTitle>
              {formMode.type === "edit" ? "Modifier l’event" : "Nouvel event"}
            </DrawerTitle>
            <DrawerDescription>
              Visible dans le calendrier pour tout le monde. Markdown supporté
              dans la description.
            </DrawerDescription>
          </DrawerHeader>

          <div className="flex-1 overflow-y-auto p-4">
            {formMode.type !== "closed" && (
              <EventForm
                mode={formMode.type === "edit" ? "edit" : "create"}
                initialEvent={
                  formMode.type === "edit" ? formMode.event : null
                }
                defaultDay={formMode.type === "create" ? formMode.day : null}
                pending={formPending}
                error={formError}
                onSubmit={(payload) => {
                  if (formMode.type === "edit") {
                    const eventId = Number.parseInt(
                      formMode.event.external_id,
                      10,
                    )
                    if (!Number.isFinite(eventId)) return
                    updateRequest.mutate({ eventId, payload })
                    return
                  }
                  createRequest.mutate(payload)
                }}
              />
            )}
          </div>

          <DrawerFooter>
            <Button
              type="submit"
              form={EVENT_FORM_ID}
              disabled={formPending}
            >
              {formPending
                ? "Enregistrement…"
                : formMode.type === "edit"
                  ? "Enregistrer"
                  : "Créer l’event"}
            </Button>
            <DrawerClose render={<Button variant="outline" />}>
              Annuler
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <ApiKeysDrawer open={apiKeysOpen} onOpenChange={setApiKeysOpen} />
    </section>
  )
}
