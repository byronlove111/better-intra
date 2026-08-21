import type { ReactNode } from "react"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type LegalPageLayoutProps = {
  title: string
  description: ReactNode
  children: ReactNode
}

export function LegalPageLayout({
  title,
  description,
  children,
}: LegalPageLayoutProps) {
  return (
    <main className="min-h-screen bg-muted/40 px-4 py-8 sm:py-12">
      <article className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link className="text-lg font-semibold" to="/">
              BetterIntra
            </Link>
            <p className="text-sm text-muted-foreground">
              Projet étudiant réalisé dans le cadre du cursus 42
            </p>
          </div>
          <Button variant="outline" render={<Link to="/" />}>
            Retour à l’application
          </Button>
        </header>

        <Card>
          <CardHeader className="border-b">
            <CardTitle className="text-2xl">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-8 leading-relaxed">
            {children}
          </CardContent>
        </Card>

        <footer className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <Link className="underline underline-offset-4 hover:text-foreground" to="/privacy">
            Politique de confidentialité
          </Link>
          <Link className="underline underline-offset-4 hover:text-foreground" to="/terms">
            Conditions d’utilisation
          </Link>
        </footer>
      </article>
    </main>
  )
}
