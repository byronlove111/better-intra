import { Link } from "react-router-dom"

type LegalLinksProps = {
  className?: string
}

export function LegalLinks({ className }: LegalLinksProps) {
  return (
    <nav aria-label="Liens légaux" className={className}>
      <Link className="underline underline-offset-4 hover:text-foreground" to="/privacy">
        Politique de confidentialité
      </Link>
      <Link className="underline underline-offset-4 hover:text-foreground" to="/terms">
        Conditions d’utilisation
      </Link>
    </nav>
  )
}
