import { Outlet, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { Footer } from '@/components/layout/footer'
import { Header } from '@/components/layout/header'

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  return (
    <>
      <Header />
      <Outlet />
      <Footer />
      <TanStackRouterDevtools position="bottom-right" />
    </>
  )
}
