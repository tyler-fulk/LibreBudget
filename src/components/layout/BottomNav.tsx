import { useState, useEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { Menu, X } from 'lucide-react'
import { navItems } from './navItems'
import { useAuth } from '../../hooks/useAuth'
import { useCloudBackup } from '../../hooks/useCloudBackup'
import { Icon } from '../ui/Icon'

const PRIMARY_PATHS = ['/', '/transactions', '/add', '/settings']
const PRIMARY_ITEMS = PRIMARY_PATHS.map((p) => navItems.find((n) => n.path === p)!)
const MORE_ITEMS = navItems.filter((n) => !PRIMARY_PATHS.includes(n.path))

export function BottomNav() {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const menuRef = useRef<HTMLDivElement>(null)
  const { user, isCloudAvailable } = useAuth()
  const { backupNow, isBacking, backupCooldown, lastBackupAt, passphraseSet } = useCloudBackup()
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(interval)
  }, [])

  const isMoreActive = MORE_ITEMS.some((item) => item.path === location.pathname)
  const isStale = lastBackupAt && (now - new Date(lastBackupAt).getTime() > 5 * 60 * 1000)

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div ref={menuRef} className="md:hidden">
      {open && (
        <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setOpen(false)} />
      )}

      {open && (
        <div className="fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom))] left-0 right-0 z-50 animate-slide-up">
          <div className="border-t border-slate-700 bg-slate-900 px-3 py-3 shadow-xl shadow-black/40">
            <div className="grid grid-cols-4 gap-1">
              {MORE_ITEMS.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex flex-col items-center gap-1 rounded-xl px-2 py-2.5 text-xs transition-colors ${
                      isActive
                        ? 'bg-green-600/15 text-green-400'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`
                  }
                >
                  <Icon name={item.icon} size={22} className="shrink-0" />
                  <span className="truncate max-w-full">{item.label}</span>
                </NavLink>
              ))}
              {isCloudAvailable && user && (
                <button
                  onClick={() => backupNow()}
                  disabled={isBacking || backupCooldown > 0 || !passphraseSet}
                  className="flex flex-col items-center gap-1 rounded-xl px-2 py-2.5 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Icon name="Cloud" size={22} className="shrink-0" />
                  <span className="truncate max-w-full">
                    {isBacking
                      ? 'Backing...'
                      : !passphraseSet
                        ? 'Set Key'
                        : backupCooldown > 0
                          ? `Wait ${backupCooldown}s`
                          : 'Back Up'}
                  </span>
                  <span className={`text-[9px] truncate max-w-full ${isStale ? 'text-red-400 font-medium' : 'text-slate-500'}`}>
                    {!passphraseSet
                      ? 'Encryption needed'
                      : lastBackupAt 
                        ? formatDistanceToNow(new Date(lastBackupAt), { addSuffix: true }).replace('about ', '').replace(' minutes', 'm').replace(' hours', 'h')
                        : 'No backup'}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-800 bg-slate-900/95 backdrop-blur-sm">
        <div className="flex items-center justify-around py-2">
          {PRIMARY_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-3 py-1 text-xs transition-colors ${
                  isActive ? 'text-green-400' : 'text-slate-500'
                }`
              }
            >
              <Icon name={item.icon} size={22} className="shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          ))}

          <button
            onClick={() => setOpen((prev) => !prev)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 text-xs transition-colors ${
              open || isMoreActive ? 'text-green-400' : 'text-slate-500'
            }`}
          >
            {open ? <X size={22} strokeWidth={2} /> : <Menu size={22} strokeWidth={2} />}
            <span>More</span>
          </button>
        </div>
      </nav>
    </div>
  )
}
