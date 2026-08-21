import { Trash2 } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { DeleteMyDataDialog } from "@/features/profile/DeleteMyDataDialog"

type DeleteMyDataButtonProps = {
  disabled?: boolean
}

export function DeleteMyDataButton({ disabled = false }: DeleteMyDataButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        <Trash2 data-icon="inline-start" />
        Supprimer mes données
      </Button>
      <DeleteMyDataDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
