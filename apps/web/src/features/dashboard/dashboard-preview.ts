import type {
  AgendaEvent,
  IntraEvaluation,
  OnlineFriend,
} from "@/features/dashboard/dashboard-api"
import type { FriendStats, UserProfile } from "@/features/profile/profile-api"
import { getPreviewProfile } from "@/features/profile/profile-preview"

type DashboardPreview = {
  profile: UserProfile
  friendStats: FriendStats
  events: AgendaEvent[]
  nextEvaluations: IntraEvaluation[]
  onlineFriends: OnlineFriend[]
}

// Fausses données utilisées uniquement pour travailler sur l'interface sans l'API.
export const dashboardPreview: DashboardPreview = {
  profile: getPreviewProfile(undefined),
  friendStats: {
    following_count: 24,
    followers_count: 18,
  },
  events: [
    {
      id: "preview:1",
      title: "Piscine discovery day",
      location: "Auditorium",
      begin_at: "2026-08-15T14:00:00+02:00",
      source: "intra",
    },
    {
      id: "preview:2",
      title: "Session de travail Transcendence",
      location: "Cluster 1",
      begin_at: "2026-08-16T18:00:00+02:00",
      source: "betterintra",
    },
  ],
  nextEvaluations: [
    {
      id: 1,
      role: "corrected",
      begin_at: "2026-08-14T15:00:00+02:00",
      project_name: "ft_transcendence",
    },
    {
      id: 2,
      role: "corrector",
      begin_at: "2026-08-18T10:00:00+02:00",
      project_name: "minishell",
    },
  ],
  onlineFriends: [
    {
      id: 1,
      login: "alice",
      display_name: "Alice Student",
      avatar_url: null,
      is_online: true,
    },
    {
      id: 2,
      login: "ayoub",
      display_name: "Ayoub Student",
      avatar_url: null,
      is_online: true,
    },
  ],
}
