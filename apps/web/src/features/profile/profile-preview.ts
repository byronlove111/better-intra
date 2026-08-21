import type { ProfileProject, UserProfile } from "@/features/profile/profile-api"

const myPreviewProfile: UserProfile = {
  login: "swann",
  display_name: "Swann Latreche",
  avatar_url: "https://api.dicebear.com/9.x/initials/svg?seed=Swann%20Latreche",
  banner_url: null,
  has_custom_avatar: false,
  email: "swann@example.com",
  bio: "Étudiant à 42 Paris, actuellement sur ft_transcendence.",
  is_betterintra_linked: true,
  is_intra_linked: true,
  intra: {
    login: "swann",
    location: "e1r4p7",
    wallet: 420,
    correction_point: 12,
    campus: [{ name: "Paris" }],
    cursus: [
      {
        id: 9,
        name: "C Piscine",
        slug: "c-piscine",
        grade: null,
        level: 10.0,
        end_at: "2024-09-01T00:00:00+02:00",
        blackholed_at: null,
      },
      {
        id: 21,
        name: "42cursus",
        slug: "42-cursus",
        grade: "Learner",
        level: 8.42,
        end_at: "2027-12-31T23:59:59+01:00",
        blackholed_at: "2027-02-04T23:59:59+01:00",
      },
    ],
  },
}

export const previewProjects: ProfileProject[] = [
  {
    id: 1,
    status: "finished",
    final_mark: 125,
    validated: true,
    marked_at: "2026-07-28T12:00:00+02:00",
    project_name: "minishell",
    updated_at: "2026-07-28T12:00:00+02:00",
    cursus_ids: [21],
  },
  {
    id: 2,
    status: "in_progress",
    final_mark: null,
    validated: null,
    marked_at: null,
    project_name: "ft_transcendence",
    updated_at: "2026-08-12T18:00:00+02:00",
    cursus_ids: [21],
  },
  {
    id: 3,
    status: "finished",
    final_mark: 100,
    validated: true,
    marked_at: "2026-06-19T10:00:00+02:00",
    project_name: "NetPractice",
    updated_at: "2026-06-19T10:00:00+02:00",
    cursus_ids: [21],
  },
  {
    id: 4,
    status: "finished",
    final_mark: 80,
    validated: true,
    marked_at: "2026-05-07T14:00:00+02:00",
    project_name: "cub3d",
    updated_at: "2026-05-07T14:00:00+02:00",
    cursus_ids: [21],
  },
  {
    id: 5,
    status: "finished",
    final_mark: 100,
    validated: true,
    marked_at: "2024-08-20T12:00:00+02:00",
    project_name: "C Piscine C 00",
    updated_at: "2024-08-20T12:00:00+02:00",
    cursus_ids: [9],
  },
]

export function getPreviewProfile(login: string | undefined): UserProfile {
  if (!login || login === "swann") {
    return myPreviewProfile
  }

  const displayName = `${login.charAt(0).toUpperCase()}${login.slice(1)} Student`

  return {
    ...myPreviewProfile,
    login,
    display_name: displayName,
    avatar_url: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(displayName)}`,
    email: null,
    bio: null,
    is_betterintra_linked: false,
  }
}
