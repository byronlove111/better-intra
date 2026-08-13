import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { Link, useNavigate } from "react-router-dom"
import { z } from "zod"

import { login } from "@/features/auth/auth-api"
import { saveTokens } from "@/features/auth/auth-storage"
import { getApiErrorMessage } from "@/lib/api"
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
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

const loginSchema = z.object({
  email: z.email("Adresse email invalide"),
  password: z.string().min(1, "Le mot de passe est requis"),
})

type LoginFormValues = z.infer<typeof loginSchema>

export function LoginPage() {
  const navigate = useNavigate()

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  const loginRequest = useMutation({
    mutationFn: login,
    onSuccess: (session) => {
      saveTokens(session.access_token, session.refresh_token)
      navigate("/dashboard")
    },
  })

  function onSubmit(values: LoginFormValues) {
    loginRequest.mutate(values)
  }

  const apiError = getApiErrorMessage(loginRequest.error)

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Connexion</CardTitle>
          <CardDescription>
            Connecte-toi à ton compte BetterIntra.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form
            className="flex flex-col gap-6"
            onSubmit={form.handleSubmit(onSubmit)}
          >
            <FieldGroup>
              <Field data-invalid={Boolean(form.formState.errors.email)}>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  aria-invalid={Boolean(form.formState.errors.email)}
                  {...form.register("email")}
                />
                <FieldError>
                  {form.formState.errors.email?.message}
                </FieldError>
              </Field>

              <Field data-invalid={Boolean(form.formState.errors.password)}>
                <FieldLabel htmlFor="password">Mot de passe</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  aria-invalid={Boolean(form.formState.errors.password)}
                  {...form.register("password")}
                />
                <FieldError>
                  {form.formState.errors.password?.message}
                </FieldError>
              </Field>
            </FieldGroup>

            {apiError && (
              <p role="alert" className="text-sm text-destructive">
                {apiError}
              </p>
            )}

            <Button type="submit" disabled={loginRequest.isPending}>
              {loginRequest.isPending ? "Connexion…" : "Se connecter"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center gap-1 text-sm text-muted-foreground">
          <span>Pas encore de compte ?</span>
          <Link className="font-medium text-foreground underline" to="/register">
            S’inscrire
          </Link>
        </CardFooter>
      </Card>
    </main>
  )
}
