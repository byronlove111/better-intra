import { CheckCircle2, CircleDollarSign, Clock3 } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  formatDateOnly,
  getDaysRemaining,
} from "@/features/profile/profile-display"

type IntraStatsCardsProps = {
  blackholedAt: string | null | undefined
  wallet: number | null | undefined
  correctionPoints: number | null | undefined
  isUnavailable?: boolean
}

export function IntraStatsCards({
  blackholedAt,
  wallet,
  correctionPoints,
  isUnavailable = false,
}: IntraStatsCardsProps) {
  const daysRemaining = getDaysRemaining(blackholedAt)

  return (
    <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
      <Card size="sm" className="gap-1 border-l-4 border-l-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock3 />
            Black hole
          </CardTitle>
          <CardDescription>Date limite actuelle</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-semibold">
            {isUnavailable ? "—" : formatDateOnly(blackholedAt)}
          </p>
          {!isUnavailable && daysRemaining !== null && (
            <p className="text-xs text-muted-foreground">
              {daysRemaining >= 0
                ? `${daysRemaining} jours restants`
                : "Date dépassée"}
            </p>
          )}
        </CardContent>
      </Card>

      <Card size="sm" className="gap-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CircleDollarSign />
            Wallet
          </CardTitle>
          <CardDescription>Wallet Intra</CardDescription>
        </CardHeader>
        <CardContent className="text-lg font-semibold">
          {isUnavailable ? "—" : `${wallet ?? 0} ₳`}
        </CardContent>
      </Card>

      <Card size="sm" className="gap-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 />
            Corrections
          </CardTitle>
          <CardDescription>Points disponibles</CardDescription>
        </CardHeader>
        <CardContent className="text-lg font-semibold">
          {isUnavailable ? "—" : correctionPoints ?? 0}
        </CardContent>
      </Card>
    </div>
  )
}
