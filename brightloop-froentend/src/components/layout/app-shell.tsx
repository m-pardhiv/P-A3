import { motion } from 'framer-motion'
import { Suspense, useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { TooltipProvider } from '@/components/ui/tooltip'
import { pageTransition } from '@/lib/motion'
import { DesktopSidebar, MobileDrawer } from './sidebar'
import { Topbar } from './topbar'

const STORAGE_KEY = 'brightloop.sidebar-collapsed'

function initialCollapsed() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== null) return stored === '1'
  } catch {
    /* storage unavailable — fall through to the default */
  }
  // Tablet widths start with the compact rail; desktop starts expanded.
  return window.matchMedia('(max-width: 1023px)').matches
}

export function AppShell() {
  const { pathname } = useLocation()
  const [collapsed, setCollapsed] = useState(initialCollapsed)
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [pathname])

  const toggle = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem(STORAGE_KEY, c ? '0' : '1')
      } catch {
        /* ignore */
      }
      return !c
    })

  return (
    <TooltipProvider>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[90] focus:rounded-full focus:bg-foreground focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-background"
      >
        Skip to content
      </a>
      <div className="flex min-h-screen">
        <DesktopSidebar collapsed={collapsed} onToggle={toggle} />
        <MobileDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar onOpenMenu={() => setDrawerOpen(true)} />
          <main id="main" tabIndex={-1} className="flex-1 px-4 pb-16 pt-2 focus:outline-none sm:px-6 lg:px-10">
            <div className="mx-auto w-full max-w-[1240px]">
              <motion.div key={pathname} {...pageTransition}>
                <Suspense fallback={<div className="min-h-[60vh]" aria-busy />}>
                  <Outlet />
                </Suspense>
              </motion.div>
            </div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  )
}
