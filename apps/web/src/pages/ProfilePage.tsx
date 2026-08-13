import { useQuery } from "@tanstack/react-query"
import { FolderKanban } from "lucide-react"
import { useEffect, useState } from "react"
import { useParams, useSearchParams } from "react-router-dom"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { IntraStatsCards } from "@/features/profile/IntraStatsCards"
import { LogtimeCard } from "@/features/profile/LogtimeCard"
import {
  type ProfileProject,
  getMyFriendStats,
  getMyProfile,
  getProfileLogtime,
  getProfileProjects,
  getUserFriendStats,
  getUserProfile,
} from "@/features/profile/profile-api"
import {
  formatDateOnly,
  getCurrentCursus,
  getInitials,
  getLevelProgress,
  getMonthRange,
  getPreviewLogtime,
} from "@/features/profile/profile-display"
import {
  getPreviewProfile,
  previewProjects,
} from "@/features/profile/profile-preview"
import { getApiErrorMessage } from "@/lib/api"

type ProjectStatus = {
  label: string
  variant: "default" | "destructive" | "secondary" | "outline"
}

function getProjectStatus(project: ProfileProject): ProjectStatus {
  if (project.validated === true) {
    return { label: "Validé", variant: "default" }
  }

  if (project.validated === false) {
    return { label: "Échoué", variant: "destructive" }
  }

  if (project.status === "in_progress") {
    return { label: "En cours", variant: "secondary" }
  }

  return { label: "À venir", variant: "outline" }
}

export function ProfilePage() {
  const { login } = useParams()
  const [searchParams] = useSearchParams()
  const isPreview =
    import.meta.env.DEV && searchParams.get("preview") === "profile"
  const isOwnProfile = !login
  const profileKey = login ?? "me"
  const [selectedMonth, setSelectedMonth] = useState(
    () => new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), 1)),
  )
  const [projectsReadyFor, setProjectsReadyFor] = useState<string | null>(null)
  const [logtimeProfile, setLogtimeProfile] = useState<string | null>(null)
  const monthRange = getMonthRange(selectedMonth)
  const profileRequest = useQuery({
    queryKey: ["profile", profileKey],
    queryFn: () => login ? getUserProfile(login) : getMyProfile(),
    enabled: !isPreview,
  })
  const hasLoadedIntraProfile = Boolean(profileRequest.data?.intra)

  useEffect(() => {
    if (isPreview || !hasLoadedIntraProfile) return

    const timer = window.setTimeout(() => {
      setProjectsReadyFor(profileKey)
    }, 2000)

    return () => window.clearTimeout(timer)
  }, [hasLoadedIntraProfile, isPreview, profileKey])

  const statsRequest = useQuery({
    queryKey: ["friends", "stats", profileKey],
    queryFn: () => login ? getUserFriendStats(login) : getMyFriendStats(),
    enabled: !isPreview && hasLoadedIntraProfile,
  })

  const logtimeRequest = useQuery({
    queryKey: ["profile", profileKey, "logtime", monthRange.beginAt],
    queryFn: () => getProfileLogtime(login, monthRange.beginAt, monthRange.endAt),
    enabled:
      !isPreview
      && hasLoadedIntraProfile
      && logtimeProfile === profileKey,
  })

  const projectsRequest = useQuery({
    queryKey: ["profile", profileKey, "projects"],
    queryFn: () => getProfileProjects(login),
    enabled:
      !isPreview
      && hasLoadedIntraProfile
      && projectsReadyFor === profileKey,
  })

  if (!isPreview && profileRequest.isPending) {
    return <p className="text-sm text-muted-foreground">Chargement du profil…</p>
  }

  const profile = isPreview
    ? getPreviewProfile(login)
    : profileRequest.data
  const error = getApiErrorMessage(profileRequest.error)

  if (!profile || error) {
    return <p className="text-sm text-destructive">{error ?? "Profil introuvable"}</p>
  }

  const cursus = getCurrentCursus(profile.intra?.cursus ?? [])
  const campus = profile.intra?.campus[0]
  const hasIntraProfile = profile.intra !== null
  const logtime = isPreview ? getPreviewLogtime(selectedMonth) : logtimeRequest.data
  const projects = isPreview ? previewProjects : (projectsRequest.data ?? [])
  const levelProgress = getLevelProgress(cursus?.level)
  const currentMonth = new Date()
  const isCurrentMonth =
    selectedMonth.getUTCFullYear() === currentMonth.getFullYear()
    && selectedMonth.getUTCMonth() === currentMonth.getMonth()
  const isLogtimeActivated = isPreview || logtimeProfile === profileKey
  const avatarFallback = getInitials(profile.display_name ?? profile.login)
  const statsUnavailable =
    !isPreview && (statsRequest.isPending || statsRequest.isError)
  const followingCount = statsUnavailable
    ? "—"
    : isPreview
      ? 24
      : (statsRequest.data?.following_count ?? 0)
  const followersCount = statsUnavailable
    ? "—"
    : isPreview
      ? 18
      : (statsRequest.data?.followers_count ?? 0)

  let bioText = "Cet élève n’a pas encore ajouté de bio."

  if (!profile.is_betterintra_linked) {
    bioText = "Cette personne n’a pas encore de compte BetterIntra."
  } else if (profile.bio?.trim()) {
    bioText = profile.bio
  }

  function changeMonth(offset: number) {
    setSelectedMonth((month) =>
      new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + offset, 1)),
    )
  }
  return (
    <section className="flex flex-col gap-6">
      <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(16rem,1fr)]">
        <Card>
          <CardContent className="flex flex-col gap-5">
            <div className="flex items-center gap-5">
              <Avatar className="size-24 shrink-0">
                <AvatarImage
                  src={profile.avatar_url ?? undefined}
                  alt={`Photo de ${profile.display_name ?? profile.login ?? "l’utilisateur"}`}
                />
                <AvatarFallback>{avatarFallback}</AvatarFallback>
              </Avatar>

              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <CardTitle>{profile.display_name ?? "Profil BetterIntra"}</CardTitle>
                <CardDescription>
                  {profile.login ? `@${profile.login}` : profile.email}
                </CardDescription>
                {hasIntraProfile && (
                  <p className="text-sm text-muted-foreground">
                    {profile.intra?.location ?? "Non connecté"}
                  </p>
                )}
                {hasIntraProfile && (
                  <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                    <p><strong>{followingCount}</strong> abonnements</p>
                    <p><strong>{followersCount}</strong> abonnés</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <p className="max-w-2xl text-sm text-muted-foreground">
                {bioText}
              </p>
              {hasIntraProfile && (
                <div className="max-w-sm">
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span>Niveau {cursus?.level?.toFixed(2) ?? "—"}</span>
                    <span className="text-muted-foreground">
                      {levelProgress} %
                    </span>
                  </div>
                  <Progress value={levelProgress} className="h-3" />
                </div>
              )}
              {hasIntraProfile && (
                <p className="text-sm text-muted-foreground">
                  {campus?.name ?? "Campus non renseigné"}
                  {cursus?.name ? ` · ${cursus.name}` : ""}
                  {cursus?.grade ? ` · ${cursus.grade}` : ""}
                  {cursus?.end_at
                    ? ` · Fin du cursus : ${formatDateOnly(cursus.end_at)}`
                    : ""}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {hasIntraProfile && (
          <IntraStatsCards
            blackholedAt={cursus?.blackholed_at}
            wallet={profile.intra?.wallet}
            correctionPoints={profile.intra?.correction_point}
          />
        )}
      </div>

      {!hasIntraProfile && (
        <Card>
          <CardHeader>
            <CardTitle>Compte Intra non lié</CardTitle>
            <CardDescription>
              {isOwnProfile
                ? "Lie ton compte 42 depuis le dashboard pour compléter ce profil."
                : "Ce profil ne possède pas encore de compte Intra lié."}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {hasIntraProfile && (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,28rem)_minmax(0,1fr)]">
          <LogtimeCard
            logtime={logtime}
            month={selectedMonth}
            isCurrentMonth={isCurrentMonth}
            isLoading={logtimeRequest.isPending && !isPreview}
            isError={logtimeRequest.isError && !isPreview}
            isActivated={isLogtimeActivated}
            canActivate={isPreview || projectsRequest.isSuccess}
            onActivate={() => setLogtimeProfile(profileKey)}
            onPreviousMonth={() => changeMonth(-1)}
            onNextMonth={() => changeMonth(1)}
          />

          <Card size="sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderKanban />
                Projets récents
              </CardTitle>
              <CardDescription>
                Les derniers projets du cursus 42.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!isPreview && projectsRequest.isPending ? (
                <p className="text-sm text-muted-foreground">
                  Chargement des projets…
                </p>
              ) : projectsRequest.isError && !isPreview ? (
                <p className="text-sm text-muted-foreground">
                  Les projets sont temporairement indisponibles.
                </p>
              ) : projects.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucun projet à afficher.
                </p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {projects.map((project) => {
                    const projectStatus = getProjectStatus(project)

                    return (
                      <li
                        key={project.id}
                        className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {project.project_name ?? "Projet sans nom"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {project.marked_at
                              ? `Évalué le ${formatDateOnly(project.marked_at)}`
                              : "Pas encore évalué"}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          {project.final_mark !== null && (
                            <strong>{project.final_mark} %</strong>
                          )}
                          <Badge variant={projectStatus.variant}>
                            {projectStatus.label}
                          </Badge>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </section>
  )
}
