import { useMutation, useQuery } from "@tanstack/react-query"
import { CheckCircle2, Link2 } from "lucide-react"
import { useSearchParams } from "react-router-dom"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  getCurrentUser,
  startFortyTwoLink,
} from "@/features/auth/auth-api"
import { getApiErrorMessage } from "@/lib/api"

export function DashboardPage() {
  const [searchParams] = useSearchParams()

  const currentUserRequest = useQuery({
    queryKey: ["auth", "me"],
    queryFn: getCurrentUser,
  })

  const linkIntraRequest = useMutation({
    mutationFn: startFortyTwoLink,
    onSuccess: (data) => {
      window.location.assign(data.authorize_url)
    },
  })

  const oauthStatus = searchParams.get("intra")
  const linkError = getApiErrorMessage(linkIntraRequest.error)

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="mt-2 text-muted-foreground">
          Bienvenue sur BetterIntra.
        </p>
      </div>

      {oauthStatus === "linked" && (
        <p className="flex items-center gap-2 text-sm text-primary">
          <CheckCircle2 />
          Ton compte Intra 42 a bien été lié.
        </p>
      )}

      {oauthStatus === "error" && (
        <p role="alert" className="text-sm text-destructive">
          La liaison avec Intra 42 a échoué. Tu peux réessayer.
        </p>
      )}

      {!currentUserRequest.data?.is_intra_linked && (
        <Card className="max-w-xl border-l-4 border-l-primary">
          <CardHeader>
            <CardTitle>Lier ton compte Intra 42</CardTitle>
            <CardDescription>
              Cette étape débloque ton profil campus, tes projets, les événements,
              les amis et le chat.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              BetterIntra ne reçoit jamais ton mot de passe 42. L’autorisation se
              fait directement sur le site de 42.
            </p>

            {linkError && (
              <p role="alert" className="mt-4 text-sm text-destructive">
                {linkError}
              </p>
            )}
          </CardContent>
          <CardFooter>
            <Button
              onClick={() => linkIntraRequest.mutate()}
              disabled={linkIntraRequest.isPending}
            >
              <Link2 data-icon="inline-start" />
              {linkIntraRequest.isPending
                ? "Redirection…"
                : "Lier mon compte 42"}
            </Button>
          </CardFooter>
        </Card>
      )}

      {currentUserRequest.data?.is_intra_linked && (
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle>Compte Intra lié</CardTitle>
            <CardDescription>
              Connecté en tant que {currentUserRequest.data.login}.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </section>
  )
}
