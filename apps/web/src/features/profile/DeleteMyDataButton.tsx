import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Trash2 } from "lucide-react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { clearTokens } from "@/features/auth/auth-storage"
import { deleteMyAccount } from "@/features/profile/profile-api"
import { getApiErrorMessage } from "@/lib/api"

type DeleteMyDataButtonProps = {
  disabled?: boolean
}

export function DeleteMyDataButton({ disabled = false }: DeleteMyDataButtonProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const deletion = useMutation({
    mutationFn: deleteMyAccount,
    onSuccess: () => {
      clearTokens()
      queryClient.clear()
      setOpen(false)
      navigate("/login", { replace: true })
    },
    onError: (err) => {
      setError(getApiErrorMessage(err) ?? "La suppression a échoué.")
    },
  })

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (deletion.isPending) return
        setOpen(next)
        if (!next) setError(null)
      }}
    >
      <AlertDialogTrigger
        render={<Button variant="ghost" size="sm" disabled={disabled} />}
      >
        <Trash2 data-icon="inline-start" />
        Supprimer mes données
      </AlertDialogTrigger>
      <AlertDialogContent size="default">
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer toutes tes données ?</AlertDialogTitle>
          <AlertDialogDescription>
            Cette action est définitive. Ton compte BetterIntra, tes jetons OAuth 42,
            clés API, événements, notifications, abonnements, blocages et conversations
            seront effacés de notre base. Tu seras déconnecté immédiatement.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deletion.isPending}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={deletion.isPending}
            onClick={(event) => {
              event.preventDefault()
              setError(null)
              deletion.mutate()
            }}
          >
            {deletion.isPending ? "Suppression…" : "Tout supprimer"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
