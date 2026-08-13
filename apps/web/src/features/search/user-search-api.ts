import { apiRequest } from "@/lib/api"

export type IntraUser = {
  id: number
  login: string
  displayname: string | null
  avatar_url: string | null
  location: string | null
}

type IntraUsersResponse = {
  items: IntraUser[]
}

export async function searchIntraUsers(query: string) {
  const response = await apiRequest<IntraUsersResponse>(
    `/intra/users?q=${encodeURIComponent(query)}&page=1&page_size=5`,
  )

  return response.items
}
