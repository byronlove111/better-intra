import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { Link, useNavigate } from "react-router-dom"
import { z } from "zod"

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
import { LegalLinks } from "@/components/LegalLinks"
import { register } from "@/features/auth/auth-api"
import { saveTokens } from "@/features/auth/auth-storage"
import { getApiErrorMessage } from "@/lib/api"

const registerSchema = z
  .object({
    email: z.email("Adresse email invalide"),
    password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
    passwordConfirmation: z.string(),
  })
  .refine((values) => values.password === values.passwordConfirmation, {
    message: "Les mots de passe ne correspondent pas",
    path: ["passwordConfirmation"],
  })

type RegisterFormValues = z.infer<typeof registerSchema>

export function RegisterPage() {
  const navigate = useNavigate()
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: "", password: "", passwordConfirmation: "" },
  })

  const registerRequest = useMutation({
    mutationFn: register,
    onSuccess: (session) => {
      saveTokens(session.access_token, session.refresh_token)
      navigate("/dashboard")
    },
  })

  function onSubmit({ email, password }: RegisterFormValues) {
    registerRequest.mutate({ email, password })
  }

  const apiError = getApiErrorMessage(registerRequest.error)

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Créer un compte</CardTitle>
          <CardDescription>Rejoins BetterIntra avec ton email.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-6" onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup>
              <Field data-invalid={Boolean(form.formState.errors.email)}>
                <FieldLabel htmlFor="register-email">Email</FieldLabel>
                <Input
                  id="register-email"
                  type="email"
                  autoComplete="email"
                  aria-invalid={Boolean(form.formState.errors.email)}
                  {...form.register("email")}
                />
                <FieldError>{form.formState.errors.email?.message}</FieldError>
              </Field>

              <Field data-invalid={Boolean(form.formState.errors.password)}>
                <FieldLabel htmlFor="register-password">Mot de passe</FieldLabel>
                <Input
                  id="register-password"
                  type="password"
                  autoComplete="new-password"
                  aria-invalid={Boolean(form.formState.errors.password)}
                  {...form.register("password")}
                />
                <FieldError>{form.formState.errors.password?.message}</FieldError>
              </Field>

              <Field data-invalid={Boolean(form.formState.errors.passwordConfirmation)}>
                <FieldLabel htmlFor="register-password-confirmation">
                  Confirmer le mot de passe
                </FieldLabel>
                <Input
                  id="register-password-confirmation"
                  type="password"
                  autoComplete="new-password"
                  aria-invalid={Boolean(form.formState.errors.passwordConfirmation)}
                  {...form.register("passwordConfirmation")}
                />
                <FieldError>
                  {form.formState.errors.passwordConfirmation?.message}
                </FieldError>
              </Field>
            </FieldGroup>

            {apiError && <p role="alert" className="text-sm text-destructive">{apiError}</p>}

            <Button type="submit" disabled={registerRequest.isPending}>
              {registerRequest.isPending ? "Création…" : "Créer mon compte"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center gap-1 text-sm text-muted-foreground">
          <span>Déjà inscrit ?</span>
          <Link className="font-medium text-foreground underline" to="/login">
            Se connecter
          </Link>
        </CardFooter>
      </Card>
      <LegalLinks className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-center text-xs text-muted-foreground" />
    </main>
  )
}
