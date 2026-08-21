import { useMutation, useQueryClient } from "@tanstack/react-query"
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
} from "@/components/ui/alert-dialog"
import { clearTokens } from "@/features/auth/auth-storage"
import { deleteMyAccount } from "@/features/profile/profile-api"
import { getApiErrorMessage } from "@/lib/api"

type DeleteMyDataDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteMyDataDialog({
  open,
  onOpenChange,
}: DeleteMyDataDialogProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  const deletion = useMutation({
    mutationFn: deleteMyAccount,
    onSuccess: () => {
      clearTokens()
      queryClient.clear()
      onOpenChange(false)
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
        onOpenChange(next)
        if (!next) setError(null)
      }}
    >
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
