import { useQuery } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import {
  type IntraUser,
  searchIntraUsers,
} from "@/features/search/user-search-api"

const previewUsers: IntraUser[] = [
  {
    id: 1,
    login: "swann",
    displayname: "Swann Latreche",
    avatar_url: null,
    location: "e1r4p7",
  },
  {
    id: 2,
    login: "alice",
    displayname: "Alice Student",
    avatar_url: null,
    location: "e2r3p4",
  },
]

type UserSearchProps = {
  isPreview: boolean
  canSearch: boolean
}

export function UserSearch({ isPreview, canSearch }: UserSearchProps) {
  const navigate = useNavigate()
  const [query, setQuery] = useState("")
  const [searchQuery, setSearchQuery] = useState("")

  // Attendre une courte pause évite une requête 42 à chaque touche du clavier.
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearchQuery(query.trim())
    }, 400)

    return () => window.clearTimeout(timeout)
  }, [query])

  const searchRequest = useQuery({
    queryKey: ["intra-users", searchQuery],
    queryFn: () => searchIntraUsers(searchQuery),
    enabled: canSearch && !isPreview && searchQuery.length >= 2,
  })

  const users = isPreview
    ? previewUsers.filter((user) => user.login.includes(searchQuery.toLowerCase()))
    : (searchRequest.data ?? [])

  let emptyMessage = "Aucun étudiant trouvé."

  if (searchQuery.length < 2) {
    emptyMessage = "Écris au moins deux caractères."
  } else if (!isPreview && searchRequest.isError) {
    emptyMessage = "La recherche est temporairement indisponible."
  } else if (!isPreview && searchRequest.isPending) {
    emptyMessage = "Recherche…"
  }

  return (
    <Combobox
      items={searchQuery.length >= 2 ? users : []}
      value={null}
      inputValue={query}
      onInputValueChange={setQuery}
      onValueChange={(user) => {
        if (!user) return
        navigate(
          `/profile/${encodeURIComponent(user.login)}${isPreview ? "?preview=profile" : ""}`,
        )
        setQuery("")
        setSearchQuery("")
      }}
      itemToStringLabel={(user: IntraUser) => user.login}
      itemToStringValue={(user: IntraUser) => user.login}
    >
      <ComboboxInput
        className="w-full"
        placeholder={canSearch
          ? "Rechercher un étudiant par son login…"
          : "Lie ton compte 42 pour rechercher un étudiant"}
        disabled={!canSearch}
        showTrigger={false}
        showClear
      />
      <ComboboxContent>
        <ComboboxEmpty>{emptyMessage}</ComboboxEmpty>
        <ComboboxList>
          {(user) => (
            <ComboboxItem key={user.id} value={user}>
              <Avatar className="size-8">
                <AvatarImage
                  src={user.avatar_url ?? undefined}
                  alt={`Photo de ${user.login}`}
                />
                <AvatarFallback>{user.login.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-medium">{user.login}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {user.displayname ?? "Nom non renseigné"}
                  {user.location ? ` · ${user.location}` : ""}
                </span>
              </span>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
