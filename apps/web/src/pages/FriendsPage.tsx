import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { MessageCircle, UserRoundMinus, Users } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router-dom"

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getCurrentUser } from "@/features/auth/auth-api"
import {
  type Friend,
  getMyFollowers,
  getMyFollowing,
  unfollowUser,
} from "@/features/friends/friends-api"
import { getInitials } from "@/features/profile/profile-display"
import { presenceOnlineQueryKey } from "@/features/realtime/presence-cache"
import { getApiErrorMessage } from "@/lib/api"

function FriendRow({
  friend,
  showUnfollow,
  onUnfollow,
  unfollowPending,
}: {
  friend: Friend
  showUnfollow: boolean
  onUnfollow: (login: string) => void
  unfollowPending: boolean
}) {
  return (
    <li className="flex items-center gap-3 rounded-lg border p-3">
      <Link
        to={`/profile/${encodeURIComponent(friend.login)}`}
        className="flex min-w-0 flex-1 items-center gap-3"
      >
        <Avatar>
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
            {friend.is_online === true && (
              <Badge variant="secondary">En ligne</Badge>
            )}
            {friend.is_betterintra_linked && (
              <Badge variant="outline">BetterIntra</Badge>
            )}
          </div>
          <p className="truncate text-sm text-muted-foreground">
            @{friend.login}
          </p>
          {friend.bio?.trim() && (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {friend.bio}
            </p>
          )}
        </div>
      </Link>

      {showUnfollow && (
        <Button
          variant="outline"
          size="sm"
          disabled={unfollowPending}
          onClick={() => onUnfollow(friend.login)}
        >
          <UserRoundMinus data-icon="inline-start" />
          Ne plus suivre
        </Button>
      )}
      {friend.is_betterintra_linked && (
        <Button
          variant="outline"
          size="sm"
          render={
            <Link
              to={`/conversations?to=${encodeURIComponent(friend.login)}`}
            />
          }
        >
          <MessageCircle data-icon="inline-start" />
          Message
        </Button>
      )}
    </li>
  )
}

export function FriendsPage() {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState("following")

  const currentUserRequest = useQuery({
    queryKey: ["auth", "me"],
    queryFn: getCurrentUser,
  })
  const isIntraLinked = currentUserRequest.data?.is_intra_linked === true

  const followingRequest = useQuery({
    queryKey: ["friends", "following"],
    queryFn: getMyFollowing,
    enabled: isIntraLinked,
  })
  const followersRequest = useQuery({
    queryKey: ["friends", "followers"],
    queryFn: getMyFollowers,
    enabled: isIntraLinked,
  })

  const unfollowRequest = useMutation({
    mutationFn: unfollowUser,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["friends"] }),
        queryClient.invalidateQueries({ queryKey: presenceOnlineQueryKey }),
      ])
    },
  })

  if (currentUserRequest.isPending) {
    return <p className="text-sm text-muted-foreground">Chargement…</p>
  }

  if (!isIntraLinked) {
    return (
      <Card className="max-w-xl border-l-4 border-l-primary">
        <CardHeader>
          <CardTitle>Amis</CardTitle>
          <CardDescription>
            Lie ton compte Intra 42 pour suivre d’autres élèves et voir tes
            abonnés.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button render={<Link to="/dashboard" />}>
            Aller au dashboard
          </Button>
        </CardContent>
      </Card>
    )
  }

  const following = followingRequest.data?.items ?? []
  const followers = followersRequest.data?.items ?? []
  const followingError = getApiErrorMessage(followingRequest.error)
  const followersError = getApiErrorMessage(followersRequest.error)
  const unfollowError = getApiErrorMessage(unfollowRequest.error)

  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Users className="text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Amis</h1>
          <p className="text-sm text-muted-foreground">
            Tes abonnements et abonnés Intra-first.
          </p>
        </div>
      </div>

      {unfollowError && (
        <p role="alert" className="text-sm text-destructive">
          {unfollowError}
        </p>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="following">
            Abonnements
            {followingRequest.data ? ` (${followingRequest.data.count})` : ""}
          </TabsTrigger>
          <TabsTrigger value="followers">
            Abonnés
            {followersRequest.data ? ` (${followersRequest.data.count})` : ""}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="following" className="mt-4">
          {followingRequest.isPending && (
            <p className="text-sm text-muted-foreground">
              Chargement des abonnements…
            </p>
          )}
          {followingError && (
            <p role="alert" className="text-sm text-destructive">
              {followingError}
            </p>
          )}
          {!followingRequest.isPending && !followingError && following.length === 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Aucun abonnement</CardTitle>
                <CardDescription>
                  Cherche un élève en haut de page, ouvre son profil, puis
                  suis-le.
                </CardDescription>
              </CardHeader>
            </Card>
          )}
          {following.length > 0 && (
            <ul className="flex flex-col gap-3">
              {following.map((friend) => (
                <FriendRow
                  key={friend.forty_two_id}
                  friend={friend}
                  showUnfollow
                  unfollowPending={unfollowRequest.isPending}
                  onUnfollow={(login) => unfollowRequest.mutate(login)}
                />
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="followers" className="mt-4">
          {followersRequest.isPending && (
            <p className="text-sm text-muted-foreground">
              Chargement des abonnés…
            </p>
          )}
          {followersError && (
            <p role="alert" className="text-sm text-destructive">
              {followersError}
            </p>
          )}
          {!followersRequest.isPending && !followersError && followers.length === 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Aucun abonné</CardTitle>
                <CardDescription>
                  Quand quelqu’un te suit, il apparaîtra ici.
                </CardDescription>
              </CardHeader>
            </Card>
          )}
          {followers.length > 0 && (
            <ul className="flex flex-col gap-3">
              {followers.map((friend) => (
                <FriendRow
                  key={friend.forty_two_id}
                  friend={friend}
                  showUnfollow={false}
                  unfollowPending={false}
                  onUnfollow={() => {}}
                />
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </section>
  )
}
