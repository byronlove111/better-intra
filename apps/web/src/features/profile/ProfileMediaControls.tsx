import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Camera, Trash2 } from "lucide-react"
import { useRef, useState, type ReactNode } from "react"

import type { AuthUser } from "@/features/auth/auth-api"
import {
  type UserProfile,
  deleteMyAvatar,
  deleteMyBanner,
  uploadMyAvatar,
  uploadMyBanner,
} from "@/features/profile/profile-api"
import { getApiErrorMessage } from "@/lib/api"
import { cn } from "@/lib/utils"

type EditableMediaProps = {
  profileKey: string
  canEdit: boolean
  children: ReactNode
  className?: string
}

export function EditableBanner({
  profileKey,
  canEdit,
  hasBanner,
  children,
  className,
}: EditableMediaProps & { hasBanner: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  const uploadRequest = useMutation({
    mutationFn: uploadMyBanner,
    onSuccess: async (profile) => {
      setError(null)
      await patchMediaCache(queryClient, profileKey, profile)
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  })

  const deleteRequest = useMutation({
    mutationFn: deleteMyBanner,
    onSuccess: async (profile) => {
      setError(null)
      await patchMediaCache(queryClient, profileKey, profile)
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  })

  const pending = uploadRequest.isPending || deleteRequest.isPending

  if (!canEdit) {
    return <div className={className}>{children}</div>
  }

  return (
    <div className={cn("group relative", className)}>
      {children}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ""
          if (file) uploadRequest.mutate(file)
        }}
      />
      <button
        type="button"
        disabled={pending}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "absolute inset-0 flex cursor-pointer items-center justify-center",
          "bg-black/0 transition-colors group-hover:bg-black/35",
          "focus-visible:bg-black/35 focus-visible:outline-none",
          pending && "pointer-events-none bg-black/35",
        )}
        aria-label="Changer la bannière"
      >
        <Camera
          className={cn(
            "size-8 text-white opacity-0 drop-shadow transition-opacity",
            "group-hover:opacity-100 group-focus-visible:opacity-100",
            pending && "opacity-100",
          )}
        />
      </button>
      {hasBanner ? (
        <button
          type="button"
          disabled={pending}
          onClick={(event) => {
            event.stopPropagation()
            deleteRequest.mutate()
          }}
          className={cn(
            "absolute top-3 right-3 z-10 flex size-8 cursor-pointer items-center justify-center",
            "rounded-full bg-black/50 text-white opacity-0 backdrop-blur transition-opacity",
            "group-hover:opacity-100 focus-visible:opacity-100",
            "hover:bg-black/70 focus-visible:outline-none",
          )}
          aria-label="Retirer la bannière"
        >
          <Trash2 className="size-4" />
        </button>
      ) : null}
      {error ? (
        <p
          role="alert"
          className="absolute bottom-3 left-3 z-10 max-w-xs rounded-md bg-background/90 px-2 py-1 text-xs text-destructive backdrop-blur"
        >
          {error}
        </p>
      ) : null}
    </div>
  )
}

export function EditableAvatar({
  profileKey,
  canEdit,
  hasCustomAvatar,
  children,
  className,
}: EditableMediaProps & { hasCustomAvatar: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  const uploadRequest = useMutation({
    mutationFn: uploadMyAvatar,
    onSuccess: async (profile) => {
      setError(null)
      await patchMediaCache(queryClient, profileKey, profile)
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  })

  const deleteRequest = useMutation({
    mutationFn: deleteMyAvatar,
    onSuccess: async (profile) => {
      setError(null)
      await patchMediaCache(queryClient, profileKey, profile)
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  })

  const pending = uploadRequest.isPending || deleteRequest.isPending

  if (!canEdit) {
    return <div className={className}>{children}</div>
  }

  return (
    <div className={cn("group relative shrink-0", className)}>
      {children}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ""
          if (file) uploadRequest.mutate(file)
        }}
      />
      <button
        type="button"
        disabled={pending}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "absolute inset-0 z-10 flex cursor-pointer items-center justify-center rounded-full",
          "bg-black/0 transition-colors group-hover:bg-black/40",
          "focus-visible:bg-black/40 focus-visible:outline-none",
          pending && "pointer-events-none bg-black/40",
        )}
        aria-label="Changer la photo de profil"
      >
        <Camera
          className={cn(
            "size-6 text-white opacity-0 drop-shadow transition-opacity",
            "group-hover:opacity-100 group-focus-visible:opacity-100",
            pending && "opacity-100",
          )}
        />
      </button>
      {hasCustomAvatar ? (
        <button
          type="button"
          disabled={pending}
          onClick={(event) => {
            event.stopPropagation()
            deleteRequest.mutate()
          }}
          className={cn(
            "absolute -top-1 -right-1 z-20 flex size-7 cursor-pointer items-center justify-center",
            "rounded-full border border-background bg-foreground text-background opacity-0",
            "transition-opacity group-hover:opacity-100 focus-visible:opacity-100",
            "hover:opacity-100 focus-visible:outline-none",
          )}
          aria-label="Revenir à la photo Intra"
        >
          <Trash2 className="size-3.5" />
        </button>
      ) : null}
      {error ? (
        <p
          role="alert"
          className="absolute top-full left-0 z-20 mt-2 max-w-40 text-xs text-destructive"
        >
          {error}
        </p>
      ) : null}
    </div>
  )
}

/** Patch local caches only — never refetch profile/logtime (would hit 42 API). */
async function patchMediaCache(
  queryClient: ReturnType<typeof useQueryClient>,
  profileKey: string,
  profile: UserProfile,
) {
  const mediaPatch = {
    avatar_url: profile.avatar_url,
    banner_url: profile.banner_url ?? null,
    has_custom_avatar: profile.has_custom_avatar ?? false,
    updated_at: profile.updated_at ?? null,
  }

  queryClient.setQueryData<UserProfile>(["profile", profileKey], (current) =>
    current ? { ...current, ...mediaPatch } : { ...profile, ...mediaPatch },
  )

  if (profileKey !== "me") {
    queryClient.setQueryData<UserProfile>(["profile", "me"], (current) =>
      current ? { ...current, ...mediaPatch } : current,
    )
  }

  queryClient.setQueryData<AuthUser>(["auth", "me"], (current) =>
    current
      ? {
          ...current,
          avatar_url: mediaPatch.avatar_url,
          banner_url: mediaPatch.banner_url,
          has_custom_avatar: mediaPatch.has_custom_avatar,
          updated_at: mediaPatch.updated_at ?? current.updated_at,
        }
      : current,
  )
}
