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

export const previewEvaluations: IntraEvaluation[] = [
  {
    id: 1,
    role: "corrected",
    begin_at: "2026-08-14T15:00:00+02:00",
    final_mark: 100,
    comment: "Super projet, les explications étaient très claires !",
    project_name: "BetterIntra team",
    corrector_login: "alice",
    corrected_logins: ["swann", "ayoub"],
    feedback_rating: 5,
    feedback_comment: "Merci pour ton évaluation.",
  },
  {
    id: 2,
    role: "corrector",
    begin_at: "2026-08-18T10:00:00+02:00",
    final_mark: 125,
    comment: "Excellent projet avec tous les bonus.",
    project_name: "Malik's team",
    corrector_login: "swann",
    corrected_logins: ["malik", "kylian"],
    feedback_rating: 5,
    feedback_comment: "Correction précise et bien expliquée.",
  },
  {
    id: 3,
    role: "corrected",
    begin_at: "2026-07-28T14:30:00+02:00",
    final_mark: 100,
    comment: "Projet fonctionnel et bien présenté.",
    project_name: "Swann's group",
    corrector_login: "bob",
    corrected_logins: ["swann"],
    feedback_rating: 4,
    feedback_comment: "Bonne évaluation, merci.",
  },
  {
    id: 4,
    role: "corrector",
    begin_at: "2026-07-19T09:00:00+02:00",
    final_mark: 100,
    comment: "Très bonne maîtrise du projet.",
    project_name: "Alice's group",
    corrector_login: "swann",
    corrected_logins: ["alice"],
    feedback_rating: 5,
    feedback_comment: "Merci pour tes conseils.",
  },
]

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
  nextEvaluations: previewEvaluations.slice(0, 2),
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
