import { useMutation, useQuery } from "@tanstack/react-query"
import {
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Link2,
  Pencil,
  Users,
} from "lucide-react"
import { useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
} from "@/components/ui/field"
import {
  getCurrentUser,
  startFortyTwoLink,
} from "@/features/auth/auth-api"
import {
  getDashboardEvaluations,
  getDashboardEvents,
  getDashboardLogtime,
  getDashboardOnlineFriends,
  isCorrectionToFinalize,
} from "@/features/dashboard/dashboard-api"
import { dashboardPreview } from "@/features/dashboard/dashboard-preview"
import {
  getMyFriendStats,
  getMyProfile,
  updateMyBio,
} from "@/features/profile/profile-api"
import { presenceOnlineQueryKey } from "@/features/realtime/presence-cache"
import { IntraStatsCards } from "@/features/profile/IntraStatsCards"
import { LogtimeCard } from "@/features/profile/LogtimeCard"
import {
  formatDate,
  formatDateOnly,
  getCurrentCursus,
  getInitials,
  getLevelProgress,
  getMonthRange,
  getPreviewLogtime,
} from "@/features/profile/profile-display"
import { getApiErrorMessage } from "@/lib/api"

export function DashboardPage() {
  const [searchParams] = useSearchParams()
  const isPreview =
    import.meta.env.DEV && searchParams.get("preview") === "dashboard"
  const [selectedMonth, setSelectedMonth] = useState(
    () => new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), 1)),
  )
  const [isEditingBio, setIsEditingBio] = useState(false)
  const [bioDraft, setBioDraft] = useState("")
  const [savedBio, setSavedBio] = useState<string | null | undefined>(undefined)
  const [requestStage, setRequestStage] = useState(0)
  const [isLogtimeActivated, setIsLogtimeActivated] = useState(false)
  const monthRange = getMonthRange(selectedMonth)

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

  const updateBioRequest = useMutation({
    mutationFn: updateMyBio,
    onSuccess: (profile) => {
      setSavedBio(profile.bio)
      setIsEditingBio(false)
    },
  })

  const isIntraLinked = currentUserRequest.data?.is_intra_linked === true

  const dashboardQueriesEnabled = isIntraLinked && !isPreview

  useEffect(() => {
    if (!dashboardQueriesEnabled) return

    const eventsTimer = window.setTimeout(() => setRequestStage(1), 2000)
    const evaluationsTimer = window.setTimeout(() => setRequestStage(2), 5000)

    return () => {
      window.clearTimeout(eventsTimer)
      window.clearTimeout(evaluationsTimer)
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
  const eventsRequest = useQuery({
    queryKey: ["dashboard", "events"],
    queryFn: getDashboardEvents,
    enabled:
      dashboardQueriesEnabled
      && requestStage >= 1
      && profileRequest.isSuccess,
  })
  const evaluationsRequest = useQuery({
    queryKey: ["dashboard", "evaluations"],
    queryFn: getDashboardEvaluations,
    enabled:
      dashboardQueriesEnabled
      && requestStage >= 2
      && eventsRequest.isSuccess,
  })
  const onlineFriendsRequest = useQuery({
    queryKey: presenceOnlineQueryKey,
    queryFn: getDashboardOnlineFriends,
    enabled: dashboardQueriesEnabled,
  })
  const logtimeRequest = useQuery({
    queryKey: ["profile", "me", "logtime", monthRange.beginAt],
    queryFn: () => getDashboardLogtime(monthRange.beginAt, monthRange.endAt),
    enabled: dashboardQueriesEnabled && isLogtimeActivated,
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
  const logtime = isPreview
    ? getPreviewLogtime(selectedMonth)
    : logtimeRequest.data
  const displayedBio = savedBio !== undefined
    ? savedBio
    : profile?.bio
  const currentCursus = getCurrentCursus(intra?.cursus ?? [])
  const currentCampus = intra?.campus[0]
  const levelProgress = getLevelProgress(currentCursus?.level)
  const avatarFallback = getInitials(profile?.display_name ?? profile?.login)
  const friendStatsUnavailable =
    !isPreview && (friendStatsRequest.isPending || friendStatsRequest.isError)
  const followingCount = friendStatsUnavailable
    ? "—"
    : (friendStats?.following_count ?? 0)
  const followersCount = friendStatsUnavailable
    ? "—"
    : (friendStats?.followers_count ?? 0)
  const currentMonth = new Date()
  const isCurrentMonth =
    selectedMonth.getUTCFullYear() === currentMonth.getFullYear()
    && selectedMonth.getUTCMonth() === currentMonth.getMonth()

  let bioText = displayedBio?.trim() || "Tu n’as pas encore ajouté de bio."

  if (!isPreview && profileRequest.isPending) {
    bioText = "Chargement de la bio…"
  } else if (!isPreview && profileRequest.isError) {
    bioText = "La bio est temporairement indisponible."
  }

  function changeMonth(offset: number) {
    setSelectedMonth((month) =>
      new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + offset, 1)),
    )
  }

  function startBioEdition() {
    updateBioRequest.reset()
    setBioDraft(displayedBio ?? "")
    setIsEditingBio(true)
  }

  function cancelBioEdition() {
    updateBioRequest.reset()
    setIsEditingBio(false)
  }

  function saveBio() {
    const newBio = bioDraft.trim()

    if (isPreview) {
      setSavedBio(newBio)
      setIsEditingBio(false)
      return
    }

    updateBioRequest.mutate(newBio)
  }

  return (
    <section className="flex flex-col gap-6">
      {oauthStatus === "linked" && (
        <p className="flex items-center gap-2 text-sm text-primary">
          <CheckCircle2 />
          Ton compte Intra 42 a bien été lié.
        </p>
      )}

      {oauthStatus === "error" && (
        <p role="alert" className="text-sm text-destructive">
          {oauthErrorMessage}
        </p>
      )}

      {!isIntraLinked && !isPreview && (
        <Card className="max-w-xl border-l-4 border-l-primary">
          <CardHeader>
            <CardTitle>Lier ton compte Intra 42</CardTitle>
            <CardDescription>
              Cette étape débloque ton profil campus, tes projets, les événements
              42, les amis et le chat.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              BetterIntra ne reçoit jamais ton mot de passe 42. L’autorisation se
              fait directement sur le site de 42.
            </p>

            {linkError && (
              <p role="alert" className="mt-4 text-sm text-destructive">
                {linkError}
              </p>
            )}
          </CardContent>
          <CardFooter>
            <Button
              onClick={() => linkIntraRequest.mutate()}
              disabled={linkIntraRequest.isPending}
            >
              <Link2 data-icon="inline-start" />
              {linkIntraRequest.isPending
                ? "Redirection…"
                : "Lier mon compte 42"}
            </Button>
          </CardFooter>
        </Card>
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
          <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(14rem,1fr)_minmax(14rem,1fr)]">
            <Card>
              <CardContent className="flex flex-col gap-5">
                <div className="flex items-center gap-5">
                  <Avatar className="size-24 shrink-0">
                    <AvatarImage
                      src={profile?.avatar_url ?? undefined}
                      alt={`Photo de ${profile?.display_name ?? profile?.login}`}
                    />
                    <AvatarFallback>{avatarFallback}</AvatarFallback>
                  </Avatar>

                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <CardTitle>
                      {profile?.display_name ?? "Profil Intra"}
                    </CardTitle>
                    <CardDescription>@{profile?.login}</CardDescription>
                    <p className="text-sm text-muted-foreground">
                      {intra.location ?? "Non connecté"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                      <Link to="/friends" className="hover:underline">
                        <strong>{followingCount}</strong> abonnements
                      </Link>
                      <Link to="/friends" className="hover:underline">
                        <strong>{followersCount}</strong> abonnés
                      </Link>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  {isEditingBio ? (
                    <FieldGroup>
                      <Field>
                        <Textarea
                          value={bioDraft}
                          onChange={(event) => setBioDraft(event.target.value)}
                          maxLength={500}
                          aria-label="Modifier ma bio"
                          disabled={updateBioRequest.isPending}
                        />
                        <FieldDescription>
                          {bioDraft.length}/500 caractères
                        </FieldDescription>
                        <FieldError>
                          {getApiErrorMessage(updateBioRequest.error)}
                        </FieldError>
                      </Field>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={saveBio}
                          disabled={updateBioRequest.isPending}
                        >
                          {updateBioRequest.isPending
                            ? "Enregistrement…"
                            : "Enregistrer"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={cancelBioEdition}
                          disabled={updateBioRequest.isPending}
                        >
                          Annuler
                        </Button>
                      </div>
                    </FieldGroup>
                  ) : (
                    <div className="flex max-w-2xl items-start gap-2">
                      <p className="flex-1 text-sm text-muted-foreground">
                        {bioText}
                      </p>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={startBioEdition}
                      >
                        <Pencil />
                        <span className="sr-only">Modifier ma bio</span>
                      </Button>
                    </div>
                  )}
                  <div className="max-w-sm">
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span>Niveau {currentCursus?.level?.toFixed(2) ?? "—"}</span>
                      <span className="text-muted-foreground">
                        {levelProgress} %
                      </span>
                    </div>
                    <Progress value={levelProgress} className="h-3" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {currentCampus?.name ?? "Campus non renseigné"}
                    {currentCursus?.name ? ` · ${currentCursus.name}` : ""}
                    {currentCursus?.grade ? ` · ${currentCursus.grade}` : ""}
                  </p>
                  {currentCursus?.end_at && (
                    <p className="text-sm">
                      Fin du cursus prévue : {formatDateOnly(currentCursus.end_at)}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <IntraStatsCards
              blackholedAt={currentCursus?.blackholed_at}
              wallet={intra.wallet}
              correctionPoints={intra.correction_point}
              isUnavailable={profileRequest.isError && !isPreview}
            />

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users />
                  Amis en ligne
                </CardTitle>
                <CardDescription>
                  {onlineFriends.length} ami
                  {onlineFriends.length > 1 ? "s" : ""} connecté
                  {onlineFriends.length > 1 ? "s" : ""}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {onlineFriendsRequest.isPending && !isPreview ? (
                  <p className="text-sm text-muted-foreground">
                    Chargement des amis en ligne…
                  </p>
                ) : onlineFriendsRequest.isError && !isPreview ? (
                  <p className="text-sm text-muted-foreground">
                    Les amis en ligne sont temporairement indisponibles.
                  </p>
                ) : onlineFriends.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Aucun ami n’est en ligne actuellement.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-4">
                    {onlineFriends.map((friend) => (
                      <li key={friend.id} className="flex items-center gap-3">
                        <Link
                          to={friend.login
                            ? `/profile/${encodeURIComponent(friend.login)}`
                            : "/friends"}
                          className="flex min-w-0 flex-1 items-center gap-3"
                        >
                          <div className="relative shrink-0">
                            <Avatar className="size-10">
                              <AvatarImage
                                src={friend.avatar_url ?? undefined}
                                alt={`Photo de ${friend.login ?? "ami"}`}
                              />
                              <AvatarFallback>
                                {(friend.login ?? "?").slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="absolute right-0 bottom-0 size-3 rounded-full border-2 border-card bg-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium">
                              {friend.display_name ?? friend.login ?? "Ami"}
                            </p>
                            {friend.login && (
                              <p className="truncate text-sm text-muted-foreground">
                                @{friend.login}
                              </p>
                            )}
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardCheck />
                  Prochaines évaluations
                </CardTitle>
                <CardDescription>
                  Les cinq prochaines évaluations ou corrections à finaliser.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {evaluationsRequest.isPending && !isPreview ? (
                  <p className="text-sm text-muted-foreground">
                    Chargement des évaluations…
                  </p>
                ) : evaluationsRequest.isError && !isPreview ? (
                  <p className="text-sm text-muted-foreground">
                    Les évaluations sont temporairement indisponibles.
                  </p>
                ) : evaluations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Aucune évaluation à venir ou à finaliser.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-4">
                    {evaluations.map((evaluation) => {
                      const isToFinalize =
                        isCorrectionToFinalize(evaluation)
                      let evaluationStatus = "À corriger"

                      if (evaluation.role === "corrected") {
                        evaluationStatus = "À faire évaluer"
                      }

                      if (isToFinalize) {
                        evaluationStatus = "À finaliser"
                      }

                      return (
                        <li key={evaluation.id}>
                          <p className="font-medium">
                            {evaluation.project_name ?? "Projet non renseigné"}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                            <span>{formatDate(evaluation.begin_at)}</span>
                            <Badge
                              variant={isToFinalize ? "secondary" : "outline"}
                            >
                              {evaluationStatus}
                            </Badge>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays />
                  Prochains événements
                </CardTitle>
                <CardDescription>Les cinq prochains événements.</CardDescription>
              </CardHeader>
              <CardContent>
                {eventsRequest.isPending && !isPreview ? (
                  <p className="text-sm text-muted-foreground">
                    Chargement des événements…
                  </p>
                ) : eventsRequest.isError && !isPreview ? (
                  <p className="text-sm text-muted-foreground">
                    Les événements sont temporairement indisponibles.
                  </p>
                ) : events.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Aucun événement à venir.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-4">
                    {events.map((event) => (
                      <li key={event.id}>
                        <p className="font-medium">{event.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(event.begin_at)}
                          {event.location ? ` · ${event.location}` : ""}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="max-w-[28rem]">
            <LogtimeCard
              logtime={logtime}
              month={selectedMonth}
              isCurrentMonth={isCurrentMonth}
              isLoading={logtimeRequest.isPending && !isPreview}
              isError={logtimeRequest.isError && !isPreview}
              isActivated={isPreview || isLogtimeActivated}
              canActivate={isPreview || evaluationsRequest.isSuccess}
              onActivate={() => setIsLogtimeActivated(true)}
              onPreviousMonth={() => changeMonth(-1)}
              onNextMonth={() => changeMonth(1)}
            />
          </div>
        </>
      )}
    </section>
  )
}
