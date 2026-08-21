import { useMutation, useQuery } from "@tanstack/react-query"
import {
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FolderKanban,
  Gauge,
  Link2,
  Users,
  type LucideIcon,
} from "lucide-react"
import { useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"

import { EmptyState } from "@/components/EmptyState"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  getCurrentUser,
  startFortyTwoLink,
} from "@/features/auth/auth-api"
import {
  getDashboardEvaluations,
  getDashboardEvents,
  getDashboardOnlineFriends,
  isCorrectionToFinalize,
} from "@/features/dashboard/dashboard-api"
import { dashboardPreview } from "@/features/dashboard/dashboard-preview"
import {
  getMyFriendStats,
  getMyProfile,
  getMyProjectsPage,
} from "@/features/profile/profile-api"
import {
  formatDate,
  formatDateOnly,
  getCurrentCursus,
  getDaysRemaining,
  getInitials,
} from "@/features/profile/profile-display"
import { previewProjects } from "@/features/profile/profile-preview"
import { presenceOnlineQueryKey } from "@/features/realtime/presence-cache"
import { getApiErrorMessage, resolveMediaUrl } from "@/lib/api"
import { cn } from "@/lib/utils"

function PriorityStat({
  label,
  value,
  icon: Icon,
  footerTitle,
  footerHint,
}: {
  label: string
  value: string
  icon: LucideIcon
  footerTitle: string
  footerHint?: string
}) {
  return (
    <Card className="@container/card">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
          {value}
        </CardTitle>
        <CardAction>
          <Badge variant="outline">
            <Icon />
          </Badge>
        </CardAction>
      </CardHeader>
      <CardFooter className="flex-col items-start gap-1.5 text-sm">
        <div className="line-clamp-1 font-medium">{footerTitle}</div>
        {footerHint ? (
          <div className="text-muted-foreground">{footerHint}</div>
        ) : null}
      </CardFooter>
    </Card>
  )
}

function formatEvalTime(value: string | null | undefined) {
  if (!value) return "—"
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

function formatEvalDay(value: string | null | undefined) {
  if (!value) return "Date inconnue"
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(value))
}

export function DashboardPage() {
  const [searchParams] = useSearchParams()
  const isPreview =
    import.meta.env.DEV && searchParams.get("preview") === "dashboard"
  const [requestStage, setRequestStage] = useState(0)

  const currentUserRequest = useQuery({
    queryKey: ["auth", "me"],
    queryFn: getCurrentUser,
    enabled: !isPreview,
  })

  const linkIntraRequest = useMutation({
    mutationFn: startFortyTwoLink,
    onSuccess: (data) => {
      window.location.assign(data.authorize_url)
    },
  })

  const isIntraLinked = currentUserRequest.data?.is_intra_linked === true

  const dashboardQueriesEnabled = isIntraLinked && !isPreview

  useEffect(() => {
    if (!dashboardQueriesEnabled) return

    const evaluationsTimer = window.setTimeout(() => setRequestStage(1), 500)
    const eventsTimer = window.setTimeout(() => setRequestStage(2), 3500)

    return () => {
      window.clearTimeout(evaluationsTimer)
      window.clearTimeout(eventsTimer)
    }
  }, [dashboardQueriesEnabled])

  const profileRequest = useQuery({
    queryKey: ["profile", "me"],
    queryFn: getMyProfile,
    enabled: dashboardQueriesEnabled,
  })
  const friendStatsRequest = useQuery({
    queryKey: ["friends", "stats", "me"],
    queryFn: getMyFriendStats,
    enabled: dashboardQueriesEnabled,
  })
  const evaluationsRequest = useQuery({
    queryKey: ["dashboard", "evaluations"],
    queryFn: getDashboardEvaluations,
    enabled:
      dashboardQueriesEnabled
      && requestStage >= 1
      && profileRequest.isSuccess,
  })
  const onlineFriendsRequest = useQuery({
    queryKey: presenceOnlineQueryKey,
    queryFn: getDashboardOnlineFriends,
    enabled: dashboardQueriesEnabled,
  })
  const eventsRequest = useQuery({
    queryKey: ["dashboard", "events", "today"],
    queryFn: getDashboardEvents,
    enabled:
      dashboardQueriesEnabled
      && requestStage >= 2
      && evaluationsRequest.isSuccess,
  })
  const projectsRequest = useQuery({
    queryKey: ["dashboard", "projects", "in_progress"],
    queryFn: async () => {
      const page = await getMyProjectsPage(1, 30)
      return page.items.filter((project) => project.status === "in_progress")
    },
    enabled: dashboardQueriesEnabled && profileRequest.isSuccess,
  })

  const oauthStatus = searchParams.get("intra")
  const oauthReason = searchParams.get("reason")
  const oauthErrorMessage = (() => {
    if (oauthStatus !== "error") return null
    switch (oauthReason) {
      case "already_linked":
        return "Ce compte Intra 42 est déjà lié à un autre compte BetterIntra. Connecte-toi avec ce compte-là, ou utilise un autre Intra."
      case "token_exchange":
        return "Échange du code OAuth échoué (code déjà utilisé ou expiré). Réessaie depuis le bouton ci-dessous."
      case "invalid_state":
      case "missing_code":
        return "Session OAuth invalide. Réessaie la liaison."
      case "db_conflict":
        return "Conflit en base lors de la liaison. Réessaie ou contacte l’équipe."
      default:
        return oauthReason
          ? `La liaison avec Intra 42 a échoué (${oauthReason}).`
          : "La liaison avec Intra 42 a échoué. Tu peux réessayer."
    }
  })()
  const linkError = getApiErrorMessage(linkIntraRequest.error)
  const profile = isPreview ? dashboardPreview.profile : profileRequest.data
  const intra = profile?.intra
  const friendStats = isPreview
    ? dashboardPreview.friendStats
    : friendStatsRequest.data
  const events = isPreview ? dashboardPreview.events : (eventsRequest.data ?? [])
  const evaluations = isPreview
    ? dashboardPreview.nextEvaluations
    : (evaluationsRequest.data ?? [])
  const onlineFriends = isPreview
    ? dashboardPreview.onlineFriends
    : (onlineFriendsRequest.data ?? [])
  const projects = isPreview
    ? previewProjects.filter((project) => project.status === "in_progress")
    : (projectsRequest.data ?? [])
  const currentCursus = getCurrentCursus(intra?.cursus ?? [])
  const currentCampus = intra?.campus[0]
  const levelLabel = currentCursus?.level != null
    ? currentCursus.level.toFixed(2)
    : null
  const avatarFallback = getInitials(profile?.display_name ?? profile?.login)
  const friendStatsUnavailable =
    !isPreview && (friendStatsRequest.isPending || friendStatsRequest.isError)
  const followingCount = friendStatsUnavailable
    ? "—"
    : (friendStats?.following_count ?? 0)
  const followersCount = friendStatsUnavailable
    ? "—"
    : (friendStats?.followers_count ?? 0)
  const daysRemaining = getDaysRemaining(currentCursus?.blackholed_at)
  const roleLine = [currentCampus?.name].filter(Boolean).join(" · ")
  const avatarSrc = resolveMediaUrl(profile?.avatar_url, profile?.updated_at)

  let bioText = profile?.bio?.trim() || "Tu n’as pas encore ajouté de bio."

  if (!isPreview && profileRequest.isPending) {
    bioText = "Chargement de la bio…"
  } else if (!isPreview && profileRequest.isError) {
    bioText = "La bio est temporairement indisponible."
  }

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-10 pb-10">
      {oauthStatus === "linked" && (
        <p className="flex items-center gap-2 text-sm text-primary">
          <CheckCircle2 className="size-4 shrink-0" />
          Ton compte Intra 42 a bien été lié.
        </p>
      )}

      {oauthStatus === "error" && (
        <p role="alert" className="text-sm text-destructive">
          {oauthErrorMessage}
        </p>
      )}

      {!isIntraLinked && !isPreview && (
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <Link2 className="text-muted-foreground" />
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                Lie ton compte Intra 42 pour débloquer le dashboard.
              </p>
            </div>
          </div>

          <EmptyState
            icon={Link2}
            title="Compte Intra non lié"
            description="Cette étape débloque ton profil campus, tes projets, les événements 42, les amis et le chat. BetterIntra ne reçoit jamais ton mot de passe 42."
          >
            <Button
              onClick={() => linkIntraRequest.mutate()}
              disabled={linkIntraRequest.isPending}
            >
              <Link2 data-icon="inline-start" />
              {linkIntraRequest.isPending
                ? "Redirection…"
                : "Lier mon compte 42"}
            </Button>
          </EmptyState>

          {linkError && (
            <p role="alert" className="text-sm text-destructive">
              {linkError}
            </p>
          )}
        </div>
      )}

      {isIntraLinked && !isPreview && profileRequest.isPending && (
        <p className="text-sm text-muted-foreground">
          Chargement du Dashboard…
        </p>
      )}

      {!isPreview && profileRequest.isError && (
        <p role="alert" className="text-sm text-destructive">
          {getApiErrorMessage(profileRequest.error)}
        </p>
      )}

      {intra && (
        <>
          <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
                  <Avatar className="size-20 sm:size-24">
                    <AvatarImage
                      src={avatarSrc}
                      alt={`Photo de ${profile?.display_name ?? profile?.login}`}
                    />
                    <AvatarFallback className="text-xl">
                      {avatarFallback}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex min-w-0 flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">
                        {profile?.display_name ?? "Profil Intra"}
                      </h1>
                      <Badge variant="outline" className="tabular-nums">
                        {profileRequest.isError && !isPreview
                          ? "—"
                          : `${intra.wallet ?? 0} ₳`}
                      </Badge>
                      {intra.location ? (
                        <Badge variant="secondary">{intra.location}</Badge>
                      ) : (
                        <Badge variant="outline">Hors campus</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      @{profile?.login}
                      {roleLine ? ` · ${roleLine}` : ""}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {!isPreview && (
                    <Button variant="outline" render={<Link to="/profile" />}>
                      Voir mon profil
                    </Button>
                  )}
                </div>
              </div>

              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {bioText}
              </p>

              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                <Link to="/friends" className="hover:underline">
                  <strong className="text-foreground">{followingCount}</strong>
                  {" "}
                  <span className="text-muted-foreground">abonnements</span>
                </Link>
                <Link to="/friends" className="hover:underline">
                  <strong className="text-foreground">{followersCount}</strong>
                  {" "}
                  <span className="text-muted-foreground">abonnés</span>
                </Link>
              </div>
            </div>

          <div className="flex flex-col gap-10">
              <section className="grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs sm:grid-cols-2 lg:grid-cols-3 dark:*:data-[slot=card]:bg-card">
                <PriorityStat
                  label="Black hole"
                  icon={Clock3}
                  value={
                    profileRequest.isError && !isPreview
                      ? "—"
                      : daysRemaining === null
                        ? formatDateOnly(currentCursus?.blackholed_at)
                        : daysRemaining >= 0
                          ? `${daysRemaining} j`
                          : "Dépassé"
                  }
                  footerTitle={
                    daysRemaining !== null && daysRemaining < 0
                      ? "Black hole dépassé"
                      : "Jours restants avant blackhole"
                  }
                  footerHint={
                    profileRequest.isError && !isPreview
                      ? undefined
                      : `Échéance · ${formatDateOnly(currentCursus?.blackholed_at)}`
                  }
                />
                <PriorityStat
                  label="Points de correction"
                  icon={CheckCircle2}
                  value={
                    profileRequest.isError && !isPreview
                      ? "—"
                      : String(intra.correction_point ?? 0)
                  }
                  footerTitle="Disponibles pour évaluer"
                  footerHint="Au-dessus de 4, expirent tous les lundis"
                />
                <PriorityStat
                  label="Niveau"
                  icon={Gauge}
                  value={
                    profileRequest.isError && !isPreview
                      ? "—"
                      : (levelLabel ?? "—")
                  }
                  footerTitle={
                    currentCursus?.name
                      ? `Cursus · ${currentCursus.name}`
                      : "Niveau actuel"
                  }
                  footerHint={
                    currentCursus?.grade
                      ? `Grade · ${currentCursus.grade}`
                      : "Progression Intra"
                  }
                />
              </section>

              <Separator />

              <section className="flex flex-col gap-5">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <h2 className="text-base font-semibold tracking-tight">
                      Évaluations à venir
                    </h2>
                  </div>
                  {!isPreview && (
                    <Link
                      to="/evaluations"
                      className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                    >
                      Tout voir
                    </Link>
                  )}
                </div>

                {evaluationsRequest.isPending && !isPreview ? (
                  <p className="text-sm text-muted-foreground">
                    Chargement des évaluations…
                  </p>
                ) : evaluationsRequest.isError && !isPreview ? (
                  <p className="text-sm text-muted-foreground">
                    Les évaluations sont temporairement indisponibles.
                  </p>
                ) : evaluations.length === 0 ? (
                  <EmptyState
                    icon={ClipboardCheck}
                    title="Aucune évaluation"
                    description="Aucune évaluation à venir ou à finaliser."
                  />
                ) : (
                  <ul className="flex flex-col">
                    {evaluations.map((evaluation, index) => {
                      const isToFinalize = isCorrectionToFinalize(evaluation)
                      let evaluationStatus = "À corriger"

                      if (evaluation.role === "corrected") {
                        evaluationStatus = "À faire évaluer"
                      }

                      if (isToFinalize) {
                        evaluationStatus = "À finaliser"
                      }

                      return (
                        <li
                          key={evaluation.id}
                          className={cn(
                            "flex items-start gap-4 py-4 sm:items-center sm:gap-6",
                            index > 0 && "border-t",
                          )}
                        >
                          <div className="w-16 shrink-0 text-left sm:w-20">
                            <p className="text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
                              {formatEvalTime(evaluation.begin_at)}
                            </p>
                            <p className="mt-0.5 text-[10px] font-medium text-muted-foreground uppercase sm:text-xs">
                              {formatEvalDay(evaluation.begin_at)}
                            </p>
                          </div>
                          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <p className="truncate text-sm font-medium sm:text-base">
                              {evaluation.project_name ?? "Projet non renseigné"}
                            </p>
                            <Badge
                              variant={isToFinalize ? "secondary" : "outline"}
                              className="w-fit shrink-0"
                            >
                              {evaluationStatus}
                            </Badge>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </section>

              <Separator />

              <div className="grid items-start gap-10 lg:grid-cols-2">
                <section className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div className="flex flex-col gap-1">
                      <h2 className="text-base font-semibold tracking-tight">
                        Amis connectés
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {onlineFriends.length} ami
                        {onlineFriends.length > 1 ? "s" : ""} en ligne
                      </p>
                    </div>
                    {!isPreview && (
                      <Link
                        to="/friends"
                        className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                      >
                        Voir
                      </Link>
                    )}
                  </div>

                  {onlineFriendsRequest.isPending && !isPreview ? (
                    <p className="text-sm text-muted-foreground">
                      Chargement…
                    </p>
                  ) : onlineFriendsRequest.isError && !isPreview ? (
                    <p className="text-sm text-muted-foreground">
                      Temporairement indisponible.
                    </p>
                  ) : onlineFriends.length === 0 ? (
                    <EmptyState
                      icon={Users}
                      title="Personne en ligne"
                      description="Aucun ami n’est en ligne actuellement."
                    />
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {onlineFriends.map((friend) => (
                        <li key={friend.id}>
                          <Link
                            to={friend.login
                              ? `/profile/${encodeURIComponent(friend.login)}`
                              : "/friends"}
                            className="flex min-w-0 items-center gap-3 py-1.5"
                          >
                            <div className="relative shrink-0">
                              <Avatar className="size-8">
                                <AvatarImage
                                  src={resolveMediaUrl(friend.avatar_url)}
                                  alt={`Photo de ${friend.login ?? "ami"}`}
                                />
                                <AvatarFallback>
                                  {(friend.login ?? "?").slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="absolute right-0 bottom-0 size-2 rounded-full border-2 border-background bg-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">
                                {friend.display_name ?? friend.login ?? "Ami"}
                              </p>
                              {friend.login && (
                                <p className="truncate text-xs text-muted-foreground">
                                  @{friend.login}
                                </p>
                              )}
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div className="flex flex-col gap-1">
                      <h2 className="text-base font-semibold tracking-tight">
                        Événements du jour
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Aujourd’hui sur le campus
                      </p>
                    </div>
                    {!isPreview && (
                      <Link
                        to="/agenda"
                        className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                      >
                        Agenda
                      </Link>
                    )}
                  </div>

                  {eventsRequest.isPending && !isPreview ? (
                    <p className="text-sm text-muted-foreground">
                      Chargement…
                    </p>
                  ) : eventsRequest.isError && !isPreview ? (
                    <p className="text-sm text-muted-foreground">
                      Temporairement indisponible.
                    </p>
                  ) : events.length === 0 ? (
                    <EmptyState
                      icon={CalendarDays}
                      title="Rien aujourd’hui"
                      description="Aucun événement prévu pour aujourd’hui."
                    />
                  ) : (
                    <ul className="flex flex-col">
                      {events.map((event, index) => (
                        <li
                          key={event.id}
                          className={cn(
                            "flex flex-col gap-0.5 py-3",
                            index > 0 && "border-t",
                          )}
                        >
                          <p className="text-sm font-medium">{event.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(event.begin_at)}
                            {event.location ? ` · ${event.location}` : ""}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>

              <Separator />

              <section className="flex flex-col gap-5">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <h2 className="text-base font-semibold tracking-tight">
                      Projets en cours
                    </h2>
                  </div>
                  {!isPreview && (
                    <Link
                      to="/projects"
                      className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                    >
                      Tout voir
                    </Link>
                  )}
                </div>

                {projectsRequest.isPending && !isPreview ? (
                  <p className="text-sm text-muted-foreground">
                    Chargement des projets…
                  </p>
                ) : projectsRequest.isError && !isPreview ? (
                  <p className="text-sm text-muted-foreground">
                    Les projets sont temporairement indisponibles.
                  </p>
                ) : projects.length === 0 ? (
                  <EmptyState
                    icon={FolderKanban}
                    title="Aucun projet en cours"
                    description="Pas de projet Intra marqué comme en cours."
                  />
                ) : (
                  <ul className="flex flex-col">
                    {projects.map((project, index) => (
                      <li
                        key={project.id}
                        className={cn(
                          "flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between",
                          index > 0 && "border-t",
                        )}
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {project.project_name ?? "Projet sans nom"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {project.updated_at
                              ? `Mis à jour le ${formatDateOnly(project.updated_at)}`
                              : "En cours"}
                          </p>
                        </div>
                        <Badge variant="secondary" className="w-fit shrink-0">
                          En cours
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
        </>
      )}
    </section>
  )
}
