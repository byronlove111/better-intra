import { Link } from '@tanstack/react-router'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import { Button } from '@/components/ui/button'

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 px-4 backdrop-blur">
      <nav className="page-wrap flex flex-wrap items-center gap-3 py-3 sm:py-4">
        <Button asChild variant="secondary" size="sm">
          <Link to="/">BetterIntra</Link>
        </Button>

        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </nav>
    </header>
  )
}
