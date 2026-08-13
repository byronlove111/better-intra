import { useQuery } from "@tanstack/react-query"
import { FolderKanban } from "lucide-react"
import { useState } from "react"
import { useSearchParams } from "react-router-dom"

import { Badge } from "@/components/ui/badge"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getCurrentUser } from "@/features/auth/auth-api"
import {
  type ProfileProject,
  getMyProjectsPage,
} from "@/features/profile/profile-api"
import { formatDateOnly } from "@/features/profile/profile-display"
import { previewProjects } from "@/features/profile/profile-preview"
import { getApiErrorMessage } from "@/lib/api"

const PAGE_SIZE = 20

type ProjectStatus = {
  label: string
  variant: "default" | "destructive" | "secondary" | "outline"
}

function getProjectStatus(project: ProfileProject): ProjectStatus {
  if (project.validated === true) {
    return { label: "Validé", variant: "default" }
  }

  if (project.validated === false) {
    return { label: "Échoué", variant: "destructive" }
  }

  if (project.status === "in_progress") {
    return { label: "En cours", variant: "secondary" }
  }

  return { label: "À venir", variant: "outline" }
}

export function ProjectsPage() {
  const [searchParams] = useSearchParams()
  const isPreview =
    import.meta.env.DEV && searchParams.get("preview") === "projects"
  const [page, setPage] = useState(1)

  const currentUserRequest = useQuery({
    queryKey: ["auth", "me"],
    queryFn: getCurrentUser,
    enabled: !isPreview,
  })

  const projectsRequest = useQuery({
    queryKey: ["projects", page],
    queryFn: () => getMyProjectsPage(page, PAGE_SIZE),
    enabled: !isPreview && currentUserRequest.data?.is_intra_linked === true,
  })

  const projects = isPreview ? previewProjects : (projectsRequest.data ?? [])
  const error = getApiErrorMessage(projectsRequest.error)
  const canGoNext = !isPreview && projects.length === PAGE_SIZE

  if (!isPreview && currentUserRequest.data?.is_intra_linked === false) {
    return (
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Compte Intra non lié</CardTitle>
          <CardDescription>
            Lie ton compte 42 depuis le dashboard pour afficher tes projets.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderKanban />
          Projets
        </CardTitle>
        <CardDescription>
          Tes projets du cursus 42, avec leur statut et leur note.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {projectsRequest.isPending && !isPreview ? (
          <p className="text-sm text-muted-foreground">
            Chargement des projets…
          </p>
        ) : error && !isPreview ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : projects.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun projet à afficher.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Projet</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Note</TableHead>
                <TableHead>Date d’évaluation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((project) => {
                const status = getProjectStatus(project)

                return (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium">
                      {project.project_name ?? "Projet sans nom"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                    <TableCell>
                      {project.final_mark !== null
                        ? `${project.final_mark} %`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {project.marked_at
                        ? formatDateOnly(project.marked_at)
                        : "—"}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <CardFooter className="justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((currentPage) => currentPage - 1)}
          disabled={page === 1 || projectsRequest.isPending}
        >
          Précédent
        </Button>
        <span className="text-sm text-muted-foreground">Page {page}</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((currentPage) => currentPage + 1)}
          disabled={!canGoNext || projectsRequest.isPending}
        >
          Suivant
        </Button>
      </CardFooter>
    </Card>
  )
}
