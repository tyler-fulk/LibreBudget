import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { navItems } from './navItems'
import { useCloudBackup } from '../../hooks/useCloudBackup'
import { Icon } from '../ui/Icon'

export function Sidebar() {
  const { backupNow, isBacking, backupCooldown, lastBackupAt, passphraseSet, enabled } = useCloudBackup()
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000) // Update every minute
    return () => clearInterval(interval)
  }, [])

  const isStale = lastBackupAt && (now - new Date(lastBackupAt).getTime() > 5 * 60 * 1000)

  return (
    <aside className="fixed left-0 top-0 hidden h-screen w-64 border-r border-slate-800 bg-slate-900 md:flex md:flex-col">
      <div className="flex shrink-0 items-center gap-3 border-b border-slate-800 px-6 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-600 font-bold text-white text-sm">
          LB
        </div>
        <span className="text-lg font-bold text-slate-100">LibreBudget</span>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3 scrollbar-thin">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-slate-800 text-green-400'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`
            }
          >
            <Icon name={item.icon} size={20} className="shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="shrink-0 border-t border-slate-800 p-4 space-y-2">
        {enabled && (
          <div className="space-y-1">
            <button
              onClick={() => backupNow()}
              disabled={isBacking || backupCooldown > 0 || !passphraseSet}
              title={!passphraseSet ? 'Create or restore vault in Account first' : undefined}
              className="w-full rounded-lg bg-slate-800 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isBacking
                ? 'Backing up...'
                : !passphraseSet
                  ? 'Set Passphrase'
                  : backupCooldown > 0
                    ? `Wait ${backupCooldown}s`
                    : 'Back Up Now'}
            </button>
            <p className={`text-[10px] text-center ${isStale ? 'text-red-400 font-medium' : 'text-slate-500'}`}>
              {!passphraseSet
                ? 'Encryption required'
                : lastBackupAt 
                  ? `Last backup: ${formatDistanceToNow(new Date(lastBackupAt), { addSuffix: true })}` 
                  : 'No backup yet'}
            </p>
          </div>
        )}
        {enabled && (
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <p className="truncate text-xs text-slate-500">Vault active</p>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0 text-xs text-slate-600">
          <NavLink to="/privacy" className="text-slate-500 hover:text-green-400">Privacy</NavLink>
          <span>·</span>
          <NavLink to="/privacy-manifesto" className="text-slate-500 hover:text-green-400">Manifesto</NavLink>
          <span>·</span>
          <NavLink to="/terms" className="text-slate-500 hover:text-green-400">Terms</NavLink>
        </div>
        <p className="text-xs text-slate-500">LibreBudget v1.0</p>
      </div>
    </aside>
  )
}
