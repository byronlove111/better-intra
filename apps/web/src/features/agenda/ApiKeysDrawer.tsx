import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Copy, KeyRound, Trash2 } from "lucide-react"
import { useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/EmptyState"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  apiKeysQueryKey,
  createApiKey,
  listApiKeys,
  revokeApiKey,
} from "@/features/agenda/api-keys-api"
import { getApiBaseUrl, getApiErrorMessage } from "@/lib/api"

type ApiKeysDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function formatDate(value: string | null) {
  if (!value) return "—"
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function buildUsageExample(apiBase: string, apiKey: string) {
  return `# Lister tes events
curl -s "${apiBase}/api/v1/events?limit=20" \\
  -H "X-API-Key: ${apiKey}"

# Créer un event
curl -s -X POST "${apiBase}/api/v1/events" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${apiKey}" \\
  -d '{
    "title": "Study session",
    "description": "Optional",
    "location": "Cluster",
    "url": "https://example.com",
    "begin_at": "2026-09-01T18:00:00+02:00",
    "end_at": "2026-09-01T20:00:00+02:00"
  }'

# Endpoints dispo (tes events uniquement) :
# GET    /api/v1/events
# POST   /api/v1/events
# GET    /api/v1/events/:id
# PUT    /api/v1/events/:id
# DELETE /api/v1/events/:id`
}

function getAbsoluteApiBaseUrl() {
  return new URL(getApiBaseUrl(), window.location.origin)
    .toString()
    .replace(/\/$/, "")
}

export function ApiKeysDrawer({ open, onOpenChange }: ApiKeysDrawerProps) {
  const queryClient = useQueryClient()
  const apiBase = getAbsoluteApiBaseUrl()
  const [name, setName] = useState("")
  const [nameError, setNameError] = useState<string | null>(null)
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState(false)
  const [copiedExample, setCopiedExample] = useState(false)

  const keysRequest = useQuery({
    queryKey: apiKeysQueryKey,
    queryFn: listApiKeys,
    enabled: open,
  })

  const createRequest = useMutation({
    mutationFn: createApiKey,
    onSuccess: async (created) => {
      setCreatedKey(created.key)
      setName("")
      setNameError(null)
      setCopiedKey(false)
      setCopiedExample(false)
      await queryClient.invalidateQueries({ queryKey: apiKeysQueryKey })
    },
  })

  const revokeRequest = useMutation({
    mutationFn: revokeApiKey,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: apiKeysQueryKey })
    },
  })

  const activeKeys = (keysRequest.data ?? []).filter((key) => !key.revoked_at)
  const listError = getApiErrorMessage(keysRequest.error)
  const createError = getApiErrorMessage(createRequest.error)
  const revokeError = getApiErrorMessage(revokeRequest.error)

  const usageExample = useMemo(
    () =>
      buildUsageExample(
        apiBase,
        createdKey ?? "bi_xxxxxxxx_REMPLACE_PAR_TA_CLE",
      ),
    [apiBase, createdKey],
  )

  function handleCreate() {
    const trimmed = name.trim()
    if (!trimmed) {
      setNameError("Nom requis")
      return
    }
    if (trimmed.length > 120) {
      setNameError("120 caractères max")
      return
    }
    setNameError(null)
    createRequest.mutate(trimmed)
  }

  async function copyText(value: string, which: "key" | "example") {
    try {
      await navigator.clipboard.writeText(value)
      if (which === "key") {
        setCopiedKey(true)
        setCopiedExample(false)
      } else {
        setCopiedExample(true)
        setCopiedKey(false)
      }
    } catch {
      // ignore clipboard errors
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} swipeDirection="right">
      <DrawerContent className="data-[swipe-axis=x]:w-full data-[swipe-axis=x]:sm:max-w-lg">
        <DrawerHeader>
          <DrawerTitle>Clés API</DrawerTitle>
          <DrawerDescription>
            Header `X-API-Key` sur `/api/v1/events`. La clé brute n’est montrée
            qu’une seule fois à la création.
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">Exemple d’utilisation</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyText(usageExample, "example")}
              >
                <Copy data-icon="inline-start" />
                {copiedExample ? "Copié" : "Copier"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Remplace la clé dans l’exemple
              {createdKey
                ? " (déjà remplie avec la clé que tu viens de créer)."
                : ", ou génère-en une ci-dessous."}
            </p>
            <pre className="overflow-x-auto rounded-md bg-muted p-3 text-[11px] leading-relaxed whitespace-pre-wrap">
              {usageExample}
            </pre>
          </div>

          <FieldGroup>
            <Field data-invalid={Boolean(nameError)}>
              <FieldLabel htmlFor="api-key-name">Nom de la clé</FieldLabel>
              <Input
                id="api-key-name"
                value={name}
                placeholder="ci-bot · script perso…"
                disabled={createRequest.isPending}
                aria-invalid={Boolean(nameError)}
                onChange={(event) => {
                  setName(event.target.value)
                  if (nameError) setNameError(null)
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault()
                    handleCreate()
                  }
                }}
              />
              <FieldError>{nameError}</FieldError>
            </Field>
          </FieldGroup>

          <Button
            onClick={handleCreate}
            disabled={createRequest.isPending}
          >
            <KeyRound data-icon="inline-start" />
            {createRequest.isPending ? "Génération…" : "Générer une clé"}
          </Button>

          {createError && (
            <p role="alert" className="text-sm text-destructive">
              {createError}
            </p>
          )}

          {createdKey && (
            <div className="flex flex-col gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
              <p className="text-sm font-medium">
                Copie cette clé maintenant — elle ne réapparaîtra plus.
              </p>
              <code className="break-all rounded-md bg-muted px-2 py-1.5 text-xs">
                {createdKey}
              </code>
              <Button
                variant="outline"
                size="sm"
                className="w-fit"
                onClick={() => copyText(createdKey, "key")}
              >
                <Copy data-icon="inline-start" />
                {copiedKey ? "Copiée" : "Copier la clé"}
              </Button>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">Tes clés actives</p>
            {keysRequest.isPending && (
              <p className="text-sm text-muted-foreground">Chargement…</p>
            )}
            {listError && (
              <p role="alert" className="text-sm text-destructive">
                {listError}
              </p>
            )}
            {revokeError && (
              <p role="alert" className="text-sm text-destructive">
                {revokeError}
              </p>
            )}
            {!keysRequest.isPending && !listError && activeKeys.length === 0 && (
              <EmptyState
                icon={KeyRound}
                title="Aucune clé active"
                description="Crée une clé pour accéder à l’API publique des events."
              />
            )}
            <ul className="flex flex-col gap-2">
              {activeKeys.map((key) => (
                <li
                  key={key.id}
                  className="flex items-start justify-between gap-3 rounded-lg border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium">{key.name}</p>
                      <Badge variant="outline">{key.prefix}…</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Créée {formatDate(key.created_at)}
                      {key.last_used_at
                        ? ` · Dernier usage ${formatDate(key.last_used_at)}`
                        : " · Jamais utilisée"}
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={revokeRequest.isPending}
                    onClick={() => {
                      if (
                        !window.confirm(
                          `Révoquer la clé « ${key.name} » ?`,
                        )
                      ) {
                        return
                      }
                      revokeRequest.mutate(key.id)
                    }}
                  >
                    <Trash2 data-icon="inline-start" />
                    Révoquer
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <DrawerFooter>
          <DrawerClose render={<Button variant="outline" />}>
            Fermer
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
