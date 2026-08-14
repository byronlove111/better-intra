import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { cn } from "@/lib/utils"

type PagePaginationProps = {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  disabled?: boolean
}

export function PagePagination({
  currentPage,
  totalPages,
  onPageChange,
  disabled = false,
}: PagePaginationProps) {
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1)

  function changePage(event: React.MouseEvent, page: number) {
    event.preventDefault()

    if (!disabled && page >= 1 && page <= totalPages) {
      onPageChange(page)
    }
  }

  const previousDisabled = disabled || currentPage === 1
  const nextDisabled = disabled || currentPage === totalPages

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-sm text-muted-foreground">
        Page {currentPage} sur {totalPages}
      </p>
      <Pagination>
        <PaginationContent className="flex-wrap justify-center">
          <PaginationItem>
            <PaginationPrevious
              href="#"
              text="Précédent"
              aria-disabled={previousDisabled}
              className={cn(previousDisabled && "pointer-events-none opacity-50")}
              onClick={(event) => changePage(event, currentPage - 1)}
            />
          </PaginationItem>

          {pages.map((page) => (
            <PaginationItem key={page}>
              <PaginationLink
                href="#"
                isActive={page === currentPage}
                aria-label={`Aller à la page ${page}`}
                onClick={(event) => changePage(event, page)}
              >
                {page}
              </PaginationLink>
            </PaginationItem>
          ))}

          <PaginationItem>
            <PaginationNext
              href="#"
              text="Suivant"
              aria-disabled={nextDisabled}
              className={cn(nextDisabled && "pointer-events-none opacity-50")}
              onClick={(event) => changePage(event, currentPage + 1)}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  )
}
