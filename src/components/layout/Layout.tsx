import { Outlet } from 'react-router-dom'
import { useApplyAccessibilitySettings } from '../../hooks/useApplyAccessibilitySettings'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'

export function Layout() {
  useApplyAccessibilitySettings()
  return (
    <div className="flex min-h-screen bg-slate-950 overflow-x-hidden">
      <Sidebar />
      <main className="min-w-0 w-full flex-1 mobile-scroll-padding overflow-x-hidden scrollbar-none md:scrollbar-thin md:pb-0 md:pl-64">
        <div className="mx-auto w-full max-w-5xl px-3 py-4 md:p-6">
          <Outlet />
        </div>
      </main>
      <BottomNav />
    </div>
  )
}
