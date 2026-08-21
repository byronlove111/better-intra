import { FileQuestion } from "lucide-react"
import { Link } from "react-router-dom"

import { EmptyState } from "@/components/EmptyState"
import { Button } from "@/components/ui/button"

export function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <EmptyState
        className="max-w-md"
        icon={FileQuestion}
        title="Page introuvable"
        description="Cette adresse ne correspond à aucune page de BetterIntra."
      >
        <Button render={<Link to="/" />}>Retour à l’accueil</Button>
      </EmptyState>
    </main>
  )
}
