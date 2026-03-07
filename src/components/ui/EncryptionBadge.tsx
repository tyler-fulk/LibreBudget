import { useShowEncryptionIndicators } from '../../hooks/useShowEncryptionIndicators'

export function EncryptionBadge() {
  const { show } = useShowEncryptionIndicators()
  if (!show) return null

  return (
    <span
      className="inline-flex items-center rounded-md border border-green-800/60 bg-green-900/20 px-1.5 py-0.5 text-[10px] text-green-400"
      title="Encrypted in backup (admins see ciphertext)"
      aria-label="Encrypted in backup"
    >
      🔒
    </span>
  )
}
