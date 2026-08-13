import { Link } from "react-router-dom"

export function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-4 text-center">
      <h1 className="text-2xl font-semibold">Page introuvable</h1>
      <p className="text-sm text-muted-foreground">
        Cette adresse ne correspond à aucune page de BetterIntra.
      </p>
      <Link className="text-sm font-medium text-primary underline" to="/">
        Retour à l’accueil
      </Link>
    </main>
  )
}
