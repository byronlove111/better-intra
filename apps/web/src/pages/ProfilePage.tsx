import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  FolderKanban,
  MessageCircle,
  Pencil,
  UserRoundMinus,
  UserRoundPlus,
} from "lucide-react"
import { useMemo, useState } from "react"
import { Link, useParams } from "react-router-dom"

import { EmptyState } from "@/components/EmptyState"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
} from "@/components/ui/field"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { getCurrentUser } from "@/features/auth/auth-api"
import { followUser, unfollowUser } from "@/features/friends/friends-api"
import { DeleteMyDataButton } from "@/features/profile/DeleteMyDataButton"
import { LogtimeHeatmap } from "@/features/profile/LogtimeHeatmap"
import {
  EditableAvatar,
  EditableBanner,
} from "@/features/profile/ProfileMediaControls"
import {
  type ProfileProject,
  getMyFriendStats,
  getMyProfile,
  getProfileLogtime,
  getProfileProjects,
  getUserFriendStats,
  getUserProfile,
  updateMyBio,
} from "@/features/profile/profile-api"
import {
  formatDateOnly,
  formatRelativeAgo,
  getCurrentCursus,
  getDaysRemaining,
  getInitials,
  getLastMonthsRange,
  getLevelProgress,
} from "@/features/profile/profile-display"
import { presenceOnlineQueryKey } from "@/features/realtime/presence-cache"
import { getApiErrorMessage, resolveMediaUrl } from "@/lib/api"
import { cn } from "@/lib/utils"

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

function isFortyTwoCursus(cursus: {
  name?: string | null
  slug?: string | null
}) {
  const name = (cursus.name ?? "").toLowerCase().replace(/[\s_-]+/g, "")
  const slug = (cursus.slug ?? "").toLowerCase()
  return name === "42cursus" || slug.includes("42-cursus") || slug === "42cursus"
}

function SidebarStat({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="text-sm font-medium">{value}</p>
      {hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}

export function ProfilePage() {
  const { login } = useParams()
  const queryClient = useQueryClient()
  const isOwnProfile = !login
  const profileKey = login ?? "me"
  const [isEditingBio, setIsEditingBio] = useState(false)
  const [bioDraft, setBioDraft] = useState("")
  const [selectedCursusId, setSelectedCursusId] = useState<number | null>(null)
  const logtimeRange = useMemo(() => getLastMonthsRange(3), [])

  const currentUserRequest = useQuery({
    queryKey: ["auth", "me"],
    queryFn: getCurrentUser,
  })

  const profileRequest = useQuery({
    queryKey: ["profile", profileKey],
    queryFn: () => (login ? getUserProfile(login) : getMyProfile()),
  })
  const hasLoadedIntraProfile = Boolean(profileRequest.data?.intra)

  const statsRequest = useQuery({
    queryKey: ["friends", "stats", profileKey],
    queryFn: () => (login ? getUserFriendStats(login) : getMyFriendStats()),
    enabled: hasLoadedIntraProfile,
  })

  const viewingOwnLogin =
    Boolean(login)
    && currentUserRequest.data?.login != null
    && currentUserRequest.data.login === login
  const canEditBio =
    (isOwnProfile || viewingOwnLogin)
    && currentUserRequest.data?.is_intra_linked === true
    && profileRequest.data?.is_betterintra_linked !== false
  const canFollow =
    !isOwnProfile
    && !viewingOwnLogin
    && currentUserRequest.data?.is_intra_linked === true
    && Boolean(login)
  const isFollowing = statsRequest.data?.is_following === true

  const followMutation = useMutation({
    mutationFn: async () => {
      if (!login) return
      if (isFollowing) {
        await unfollowUser(login)
      } else {
        await followUser(login)
      }
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["friends"] }),
        queryClient.invalidateQueries({ queryKey: presenceOnlineQueryKey }),
      ])
    },
  })

  const updateBioRequest = useMutation({
    mutationFn: updateMyBio,
    onSuccess: async (updated) => {
      setIsEditingBio(false)
      const bioPatch = {
        bio: updated.bio,
        updated_at: updated.updated_at ?? null,
      }
      queryClient.setQueryData(["profile", profileKey], (current: typeof updated | undefined) =>
        current ? { ...current, ...bioPatch } : updated,
      )
      if (profileKey !== "me") {
        queryClient.setQueryData(["profile", "me"], (current: typeof updated | undefined) =>
          current ? { ...current, ...bioPatch } : current,
        )
      }
      queryClient.setQueryData(["auth", "me"], (current: { bio?: string | null; updated_at?: string } | undefined) =>
        current
          ? {
              ...current,
              bio: bioPatch.bio,
              updated_at: bioPatch.updated_at ?? current.updated_at,
            }
          : current,
      )
    },
  })

  const logtimeRequest = useQuery({
    queryKey: ["logtime", profileKey, logtimeRange.beginAt],
    queryFn: () =>
      getProfileLogtime(login, logtimeRange.beginAt, logtimeRange.endAt),
    enabled: hasLoadedIntraProfile,
    refetchInterval: hasLoadedIntraProfile ? 600_000 : false,
    refetchIntervalInBackground: false,
  })

  const projectsRequest = useQuery({
    queryKey: ["projects", profileKey],
    queryFn: () => getProfileProjects(login),
    enabled: hasLoadedIntraProfile,
  })

  if (profileRequest.isPending) {
    return <p className="text-sm text-muted-foreground">Chargement du profil…</p>
  }

  const profile = profileRequest.data
  const error = getApiErrorMessage(profileRequest.error)

  if (!profile || error) {
    return (
      <p className="text-sm text-destructive">{error ?? "Profil introuvable"}</p>
    )
  }

  const profileBio = profile.bio
  const cursus = getCurrentCursus(profile.intra?.cursus ?? [])
  const campus = profile.intra?.campus[0]
  const hasIntraProfile = profile.intra !== null
  const logtime = logtimeRequest.data
  const projects = projectsRequest.data ?? []
  const availableCursus = (profile.intra?.cursus ?? []).filter(
    (item) => item.id != null,
  )
  const defaultCursusId = availableCursus.find(isFortyTwoCursus)?.id
    ?? availableCursus[0]?.id
    ?? null
  const activeCursusId = selectedCursusId != null
    && availableCursus.some((item) => item.id === selectedCursusId)
    ? selectedCursusId
    : defaultCursusId
  const filteredProjects = activeCursusId == null
    ? projects
    : projects.filter((project) =>
      (project.cursus_ids ?? []).includes(activeCursusId),
    )
  const levelProgress = getLevelProgress(cursus?.level)
  const avatarFallback = getInitials(profile.display_name ?? profile.login)
  const statsUnavailable =
    statsRequest.isPending || statsRequest.isError
  const followingCount = statsUnavailable
    ? "—"
    : (statsRequest.data?.following_count ?? 0)
  const followersCount = statsUnavailable
    ? "—"
    : (statsRequest.data?.followers_count ?? 0)
  const followError = getApiErrorMessage(followMutation.error)
  const daysRemaining = getDaysRemaining(cursus?.blackholed_at)
  const roleLine = [
    campus?.name,
    cursus?.grade,
    cursus?.name,
  ].filter(Boolean).join(" · ")

  const canEditMedia = canEditBio
  const bannerSrc = resolveMediaUrl(profile.banner_url, profile.updated_at)
  const avatarSrc = resolveMediaUrl(profile.avatar_url, profile.updated_at)

  let bioText = "Cet élève n’a pas encore ajouté de bio."

  if (!profile.is_betterintra_linked) {
    bioText = "Cette personne n’a pas encore de compte BetterIntra."
  } else if (profileBio?.trim()) {
    bioText = profileBio
  } else if (canEditBio) {
    bioText = "Tu n’as pas encore ajouté de bio."
  }

  function startBioEdition() {
    updateBioRequest.reset()
    setBioDraft(profileBio ?? "")
    setIsEditingBio(true)
  }

  function cancelBioEdition() {
    updateBioRequest.reset()
    setIsEditingBio(false)
  }

  function saveBio() {
    updateBioRequest.mutate(bioDraft.trim())
  }

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-10 pb-10">
      {/* Hero */}
      <div className="flex flex-col">
        <EditableBanner
          profileKey={profileKey}
          canEdit={canEditMedia}
          hasBanner={Boolean(profile.banner_url)}
          className={cn(
            "relative h-36 overflow-hidden rounded-2xl sm:h-44",
            !bannerSrc
              && "bg-[linear-gradient(135deg,oklch(0.92_0.04_290),oklch(0.88_0.06_250)_45%,oklch(0.94_0.02_220))] dark:bg-[linear-gradient(135deg,oklch(0.28_0.05_290),oklch(0.22_0.04_250)_50%,oklch(0.26_0.03_220))]",
          )}
        >
          {bannerSrc ? (
            <img
              src={bannerSrc}
              alt=""
              className="size-full object-cover"
            />
          ) : (
            <div
              aria-hidden
              className="absolute inset-0 bg-size-[18px_18px] bg-[radial-gradient(circle_at_1px_1px,currentColor_1px,transparent_0)] text-foreground/20 opacity-[0.35]"
            />
          )}
        </EditableBanner>

        <div className="relative z-10 -mt-12 flex flex-col gap-6 px-1 sm:-mt-14 sm:px-2">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-5">
              <EditableAvatar
                profileKey={profileKey}
                canEdit={canEditMedia}
                hasCustomAvatar={profile.has_custom_avatar === true}
              >
                <Avatar className="size-24 ring-4 ring-background sm:size-28">
                  <AvatarImage
                    src={avatarSrc}
                    alt={`Photo de ${profile.display_name ?? profile.login ?? "l’utilisateur"}`}
                  />
                  <AvatarFallback className="text-xl">
                    {avatarFallback}
                  </AvatarFallback>
                </Avatar>
              </EditableAvatar>

              <div className="flex min-w-0 flex-col gap-2 pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">
                    {profile.display_name ?? "Profil BetterIntra"}
                  </h1>
                  {profile.is_betterintra_linked && profile.is_online === true && (
                    <Badge variant="secondary">En ligne</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {profile.login ? `@${profile.login}` : profile.email}
                  {roleLine ? ` · ${roleLine}` : ""}
                </p>
                {hasIntraProfile && profile.intra?.location && (
                  <p className="text-sm text-muted-foreground">
                    {profile.intra.location}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {canFollow && (
                <>
                  <Button
                    variant={isFollowing ? "outline" : "default"}
                    disabled={followMutation.isPending || statsRequest.isPending}
                    onClick={() => followMutation.mutate()}
                  >
                    {isFollowing ? (
                      <UserRoundMinus data-icon="inline-start" />
                    ) : (
                      <UserRoundPlus data-icon="inline-start" />
                    )}
                    {followMutation.isPending
                      ? "…"
                      : isFollowing
                        ? "Ne plus suivre"
                        : "Suivre"}
                  </Button>
                  {profile.is_betterintra_linked && login && (
                    <Button
                      variant="outline"
                      render={
                        <Link
                          to={`/conversations?to=${encodeURIComponent(login)}`}
                        />
                      }
                    >
                      <MessageCircle data-icon="inline-start" />
                      Message
                    </Button>
                  )}
                </>
              )}
              {canEditBio && !isEditingBio && (
                <Button variant="outline" onClick={startBioEdition}>
                  <Pencil data-icon="inline-start" />
                  Modifier la bio
                </Button>
              )}
            </div>
          </div>

          {followError && (
            <p role="alert" className="text-sm text-destructive">
              {followError}
            </p>
          )}

          {canEditBio && isEditingBio ? (
            <FieldGroup className="max-w-2xl">
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
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {bioText}
            </p>
          )}

          {hasIntraProfile && (
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
              {(isOwnProfile || viewingOwnLogin) ? (
                <>
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
                </>
              ) : (
                <>
                  <p>
                    <strong>{followingCount}</strong>
                    {" "}
                    <span className="text-muted-foreground">abonnements</span>
                  </p>
                  <p>
                    <strong>{followersCount}</strong>
                    {" "}
                    <span className="text-muted-foreground">abonnés</span>
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {!hasIntraProfile ? (
        <EmptyState
          icon={FolderKanban}
          title="Compte Intra non lié"
          description={
            isOwnProfile
              ? "Lie ton compte 42 depuis le dashboard pour compléter ce profil."
              : "Ce profil ne possède pas encore de compte Intra lié."
          }
        />
      ) : (
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_16rem]">
          <div className="flex min-w-0 flex-col gap-10">
            <LogtimeHeatmap
              logtime={logtime}
              begin={logtimeRange.begin}
              end={logtimeRange.end}
              isLoading={logtimeRequest.isPending}
              isError={logtimeRequest.isError}
              showAnalyticsLink={isOwnProfile || viewingOwnLogin}
            />

            <Separator />

            <section className="flex flex-col gap-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-base font-semibold tracking-tight">
                  Projets
                </h2>
                <div className="flex flex-wrap items-center gap-2">
                  {availableCursus.length > 0 && activeCursusId != null ? (
                    <Select
                      value={String(activeCursusId)}
                      onValueChange={(value) => {
                        if (value != null) setSelectedCursusId(Number(value))
                      }}
                    >
                      <SelectTrigger size="sm" className="min-w-40">
                        <SelectValue>
                          {availableCursus.find((item) => item.id === activeCursusId)?.name
                            ?? `Cursus ${activeCursusId}`}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent align="end">
                        {availableCursus.map((item) => (
                          <SelectItem
                            key={item.id!}
                            value={String(item.id)}
                          >
                            {item.name ?? `Cursus ${item.id}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : null}
                  {(isOwnProfile || viewingOwnLogin) && (
                    <Link
                      to="/projects"
                      className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                    >
                      Vue paginée
                    </Link>
                  )}
                </div>
              </div>

              {projectsRequest.isPending ? (
                <p className="text-sm text-muted-foreground">
                  Chargement des projets…
                </p>
              ) : projectsRequest.isError ? (
                <p className="text-sm text-muted-foreground">
                  Les projets sont temporairement indisponibles.
                </p>
              ) : filteredProjects.length === 0 ? (
                <EmptyState
                  icon={FolderKanban}
                  title="Aucun projet"
                  description="Aucun projet pour ce cursus."
                />
              ) : (
                <ul className="flex flex-col">
                  {filteredProjects.map((project, index) => {
                    const projectStatus = getProjectStatus(project)

                    return (
                      <li
                        key={project.id}
                        className={cn(
                          "flex flex-col gap-0.5 py-2.5 sm:flex-row sm:items-center sm:justify-between",
                          index > 0 && "border-t",
                        )}
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {project.project_name ?? "Projet sans nom"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {project.marked_at
                              ? (formatRelativeAgo(project.marked_at) ??
                                "Pas encore évalué")
                              : "Pas encore évalué"}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          {project.final_mark !== null ? (
                            <span
                              className={cn(
                                "text-sm font-semibold tabular-nums",
                                project.validated === true
                                  ? "text-emerald-500"
                                  : "text-destructive",
                              )}
                            >
                              {project.final_mark}
                            </span>
                          ) : (
                            <Badge variant={projectStatus.variant}>
                              {projectStatus.label}
                            </Badge>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          </div>

          <aside className="flex flex-col gap-8 lg:sticky lg:top-4 lg:self-start">
            <div className="flex flex-col gap-3">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Niveau
              </p>
              <p className="text-2xl font-semibold tracking-tight tabular-nums">
                {cursus?.level?.toFixed(2) ?? "—"}
              </p>
              <Progress value={levelProgress} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {levelProgress} % vers le prochain niveau
              </p>
            </div>

            <Separator />

            <div className="flex flex-col gap-5">
              <SidebarStat
                label="Prochaine milestone"
                value={formatDateOnly(cursus?.blackholed_at)}
                hint={
                  daysRemaining === null
                    ? undefined
                    : daysRemaining >= 0
                      ? `${daysRemaining} jours restants`
                      : "Milestone dépassée"
                }
              />
              <SidebarStat
                label="Wallet"
                value={`${profile.intra?.wallet ?? 0} ₳`}
              />
              <SidebarStat
                label="Corrections"
                value={String(profile.intra?.correction_point ?? 0)}
              />
              {cursus?.end_at && (
                <SidebarStat
                  label="Fin de cursus"
                  value={formatDateOnly(cursus.end_at)}
                />
              )}
            </div>

            {isOwnProfile || viewingOwnLogin ? (
              <>
                <Separator />
                <DeleteMyDataButton />
              </>
            ) : null}
          </aside>
        </div>
      )}
    </section>
  )
}
