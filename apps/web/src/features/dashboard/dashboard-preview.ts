import type {
  AgendaEvent,
  IntraEvaluation,
  IntraProfile,
  OnlineFriend,
} from "@/features/dashboard/dashboard-api"
import type { FriendStats } from "@/features/profile/profile-api"

type DashboardPreview = {
  profile: {
    bio: string | null
  }
  friendStats: FriendStats
  intra: IntraProfile
  events: AgendaEvent[]
  nextEvaluations: IntraEvaluation[]
  onlineFriends: OnlineFriend[]
}

// Fausses données utilisées uniquement pour travailler sur l'interface sans l'API.
export const dashboardPreview: DashboardPreview = {
  profile: {
    bio: "Étudiant à 42 Paris, actuellement sur ft_transcendence.",
  },
  friendStats: {
    following_count: 24,
    followers_count: 18,
  },
  intra: {
    login: "swann",
    displayname: "Swann Latreche",
    wallet: 420,
    correction_point: 12,
    location: "e1r4p7",
    avatar_url: "https://api.dicebear.com/9.x/initials/svg?seed=Swann%20Latreche",
    campus: [{ name: "Paris", city: "Paris", country: "France" }],
    cursus: [
      {
        name: "42cursus",
        grade: "Learner",
        level: 8.42,
        end_at: "2027-12-31T23:59:59+01:00",
        blackholed_at: "2027-02-04T23:59:59+01:00",
      },
    ],
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
