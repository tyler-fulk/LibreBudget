import { useState, useEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { Menu, X } from 'lucide-react'
import { navGroups, navItems } from './navItems'
import { useCloudBackup } from '../../hooks/useCloudBackup'
import { Icon } from '../ui/Icon'

const PRIMARY_PATHS = ['/', '/transactions', '/add', '/goals']
const PRIMARY_ITEMS = PRIMARY_PATHS.map((p) => navItems.find((n) => n.path === p)!)

// Groups that have at least one non-primary item
const MORE_GROUPS = navGroups
  .map((g) => ({ ...g, items: g.items.filter((n) => !PRIMARY_PATHS.includes(n.path)) }))
  .filter((g) => g.items.length > 0)

const ALL_MORE_ITEMS = MORE_GROUPS.flatMap((g) => g.items)

export function BottomNav() {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const menuRef = useRef<HTMLDivElement>(null)
  const { backupNow, isBacking, backupCooldown, lastBackupAt, passphraseSet, enabled } = useCloudBackup()
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(interval)
  }, [])

  const isMoreActive = ALL_MORE_ITEMS.some((item) => item.path === location.pathname)
  const isStale = lastBackupAt && (now - new Date(lastBackupAt).getTime() > 5 * 60 * 1000)

  useEffect(() => { setOpen(false) }, [location.pathname])

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div ref={menuRef} className="md:hidden">
      {/* Backdrop */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setOpen(false)} />
      )}

      {/* More menu */}
      {open && (
        <div
          className="fixed left-3 right-3 z-50 animate-slide-up overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900 shadow-2xl shadow-black/60"
          style={{ bottom: 'calc(4.75rem + max(env(safe-area-inset-bottom), 0.75rem))' }}
        >
          <div className="p-3 space-y-3">
            {MORE_GROUPS.map((group, i) => (
              <div key={group.label}>
                {i > 0 && <div className="border-t border-slate-800 -mx-3 mb-3" />}
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-600 px-1 mb-1.5">
                  {group.label}
                </p>
                <div className="flex gap-1">
                  {group.items.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={({ isActive }) =>
                        `flex flex-1 flex-col items-center gap-1 rounded-xl py-2.5 px-1 text-center transition-colors ${
                          isActive
                            ? 'bg-green-600/15 text-green-400'
                            : 'text-slate-400 active:bg-slate-800'
                        }`
                      }
                    >
                      <Icon name={item.icon} size={20} className="shrink-0" />
                      <span className="text-[10px] leading-tight whitespace-nowrap">{item.label}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}

            {/* Cloud backup */}
            {enabled && (
              <>
                <div className="border-t border-slate-800 -mx-3" />
                <button
                  onClick={() => backupNow()}
                  disabled={isBacking || backupCooldown > 0 || !passphraseSet}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-slate-400 active:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Icon name="Cloud" size={18} className="shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium">
                      {isBacking ? 'Backing up…' : !passphraseSet ? 'Set Encryption Key' : backupCooldown > 0 ? `Wait ${backupCooldown}s` : 'Back Up Now'}
                    </p>
                    <p className={`text-[10px] truncate ${isStale ? 'text-red-400' : 'text-slate-500'}`}>
                      {!passphraseSet
                        ? 'Encryption needed'
                        : lastBackupAt
                          ? formatDistanceToNow(new Date(lastBackupAt), { addSuffix: true }).replace('about ', '')
                          : 'No backup yet'}
                    </p>
                  </div>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Primary nav pill */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 px-3"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.75rem)' }}
      >
        <div className="flex items-center rounded-2xl border border-slate-700/50 bg-slate-900/95 backdrop-blur-md shadow-xl shadow-black/50">
          {PRIMARY_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-0.5 rounded-xl py-2 text-xs transition-colors ${
                  isActive ? 'text-green-400 bg-green-500/10' : 'text-slate-500 active:bg-slate-800/80'
                }`
              }
            >
              <Icon name={item.icon} size={22} className="shrink-0" />
              <span className="hidden min-[370px]:block text-[10px] leading-none whitespace-nowrap">{item.label}</span>
            </NavLink>
          ))}

          <button
            onClick={() => setOpen((prev) => !prev)}
            className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl py-2 text-xs transition-colors ${
              open || isMoreActive ? 'text-green-400 bg-green-500/10' : 'text-slate-500 active:bg-slate-800/80'
            }`}
          >
            {open ? <X size={22} strokeWidth={2} /> : <Menu size={22} strokeWidth={2} />}
            <span className="hidden min-[370px]:block text-[10px] leading-none whitespace-nowrap">More</span>
          </button>
        </div>
      </nav>
    </div>
  )
}
