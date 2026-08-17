import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Users } from "lucide-react"
import { useState } from "react"
import { Link, useSearchParams } from "react-router-dom"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
import { getCurrentUser } from "@/features/auth/auth-api"
import {
  type Friend,
  getFollowers,
  getFollowing,
} from "@/features/friends/friends-api"
import {
  getMyFriendStats,
  unfollowUser,
} from "@/features/profile/profile-api"
import { getInitials } from "@/features/profile/profile-display"
import { getApiErrorMessage } from "@/lib/api"

type FriendsView = "following" | "followers"

const previewFollowing: Friend[] = [
  {
    forty_two_id: 1,
    login: "alice",
    display_name: "Alice Student",
    avatar_url: null,
    followed_at: "2026-08-10T10:00:00Z",
    is_betterintra_linked: true,
    betterintra_user_id: 2,
    bio: "Étudiante à 42 Paris.",
    is_online: true,
  },
  {
    forty_two_id: 2,
    login: "bob",
    display_name: "Bob Learner",
    avatar_url: null,
    followed_at: "2026-08-08T10:00:00Z",
    is_betterintra_linked: false,
    betterintra_user_id: null,
    bio: null,
    is_online: null,
  },
]

const previewFollowers: Friend[] = [
  {
    forty_two_id: 3,
    login: "charlie",
    display_name: "Charlie Student",
    avatar_url: null,
    followed_at: "2026-08-12T10:00:00Z",
    is_betterintra_linked: true,
    betterintra_user_id: 3,
    bio: "Common Core en cours.",
    is_online: false,
  },
]

export function FriendsPage() {
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const isPreview =
    import.meta.env.DEV && searchParams.get("preview") === "friends"
  const [view, setView] = useState<FriendsView>("following")
  const [previewFollowingList, setPreviewFollowingList] =
    useState(previewFollowing)

  const currentUserRequest = useQuery({
    queryKey: ["auth", "me"],
    queryFn: getCurrentUser,
    enabled: !isPreview,
  })

  const statsRequest = useQuery({
    queryKey: ["friends", "stats", "me"],
    queryFn: getMyFriendStats,
    enabled: !isPreview && currentUserRequest.data?.is_intra_linked === true,
  })

  const friendsRequest = useQuery({
    queryKey: ["friends", view],
    queryFn: view === "following" ? getFollowing : getFollowers,
    enabled: !isPreview && currentUserRequest.data?.is_intra_linked === true,
  })

  const unfollowRequest = useMutation({
    mutationFn: unfollowUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friends"] })
      queryClient.invalidateQueries({
        queryKey: ["dashboard", "online-friends"],
      })
    },
  })

  const friends = isPreview
    ? view === "following"
      ? previewFollowingList
      : previewFollowers
    : (friendsRequest.data?.items ?? [])
  const followingCount = isPreview
    ? previewFollowingList.length
    : statsRequest.data?.following_count
  const followersCount = isPreview
    ? previewFollowers.length
    : statsRequest.data?.followers_count
  const error = getApiErrorMessage(friendsRequest.error)
  const unfollowError = getApiErrorMessage(unfollowRequest.error)

  function unfollow(login: string) {
    if (isPreview) {
      setPreviewFollowingList((currentFriends) =>
        currentFriends.filter((friend) => friend.login !== login),
      )
      return
    }

    unfollowRequest.mutate(login)
  }

  if (!isPreview && currentUserRequest.data?.is_intra_linked === false) {
    return (
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Compte Intra non lié</CardTitle>
          <CardDescription>
            Lie ton compte 42 depuis le dashboard pour gérer tes amis.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <Users />
          Amis
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Retrouve les personnes que tu suis et celles qui te suivent.
        </p>
      </div>

      <ToggleGroup
        value={[view]}
        onValueChange={(values) => {
          const selectedView = values[0]

          if (selectedView === "following" || selectedView === "followers") {
            setView(selectedView)
          }
        }}
        variant="outline"
        spacing={0}
      >
        <ToggleGroupItem value="following">
          Abonnements {followingCount !== undefined ? `(${followingCount})` : ""}
        </ToggleGroupItem>
        <ToggleGroupItem value="followers">
          Abonnés {followersCount !== undefined ? `(${followersCount})` : ""}
        </ToggleGroupItem>
      </ToggleGroup>

      <Card>
        <CardHeader>
          <CardTitle>
            {view === "following" ? "Mes abonnements" : "Mes abonnés"}
          </CardTitle>
          <CardDescription>
            {view === "following"
              ? "Les élèves dont tu suis l’activité."
              : "Les élèves qui suivent ton activité."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {friendsRequest.isPending && !isPreview ? (
            <p className="text-sm text-muted-foreground">Chargement des amis…</p>
          ) : error && !isPreview ? (
            <p role="alert" className="text-sm text-destructive">{error}</p>
          ) : friends.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {view === "following"
                ? "Tu ne suis encore personne."
                : "Tu n’as pas encore d’abonné."}
            </p>
          ) : (
            <ul className="flex flex-col gap-5">
              {friends.map((friend) => (
                <li
                  key={friend.forty_two_id}
                  className="flex flex-col gap-4 sm:flex-row sm:items-center"
                >
                  <Avatar className="size-12">
                    <AvatarImage
                      src={friend.avatar_url ?? undefined}
                      alt={`Photo de ${friend.login}`}
                    />
                    <AvatarFallback>
                      {getInitials(friend.display_name ?? friend.login)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium">
                        {friend.display_name ?? friend.login}
                      </p>
                      {!friend.is_betterintra_linked ? (
                        <Badge variant="outline">Intra uniquement</Badge>
                      ) : friend.is_online ? (
                        <Badge>En ligne</Badge>
                      ) : (
                        <Badge variant="secondary">Hors ligne</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      @{friend.login}
                    </p>
                    {friend.bio && (
                      <p className="mt-1 truncate text-sm text-muted-foreground">
                        {friend.bio}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      render={
                        <Link
                          to={`/profile/${encodeURIComponent(friend.login)}${isPreview ? "?preview=profile" : ""}`}
                        />
                      }
                    >
                      Voir le profil
                    </Button>
                    {view === "following" && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => unfollow(friend.login)}
                        disabled={unfollowRequest.isPending}
                      >
                        {unfollowRequest.isPending
                        && unfollowRequest.variables === friend.login
                          ? "Suppression…"
                          : "Se désabonner"}
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {unfollowError && !isPreview && (
            <p role="alert" className="mt-4 text-sm text-destructive">
              {unfollowError}
            </p>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
