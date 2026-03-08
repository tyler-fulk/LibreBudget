import { generateMnemonic, mnemonicToSeedSync } from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english'

const STORAGE_ID_INFO = 'LibreBudget-Storage-ID-v1'
const ENCRYPTION_KEY_INFO = 'LibreBudget-Encryption-Key-v1'
const IV_LENGTH = 12
const CHUNK = 0x8000

function uint8ToBase64(bytes: Uint8Array): string {
  const parts: string[] = []
  for (let i = 0; i < bytes.length; i += CHUNK) {
    parts.push(String.fromCharCode(...bytes.subarray(i, i + CHUNK)))
  }
  return btoa(parts.join(''))
}

/**
 * Generates a new 24-word BIP39 mnemonic for wallet creation.
 */
export function generateWallet(): string {
  return generateMnemonic(wordlist, 256)
}

/**
 * Derives Anonymous_ID (KV key) and Encryption_Key from a BIP39 mnemonic.
 * Uses HKDF-SHA256 to expand the 512-bit BIP39 seed into two distinct 256-bit outputs.
 */
export async function deriveKeys(
  mnemonic: string
): Promise<{ anonymousId: string; encryptionKey: CryptoKey }> {
  const seed = mnemonicToSeedSync(mnemonic)
  const seedBytes = new Uint8Array(seed)

  const baseKey = await crypto.subtle.importKey(
    'raw',
    seedBytes,
    { name: 'HKDF' },
    false,
    ['deriveBits']
  )

  const storageIdBits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new Uint8Array(0),
      info: new TextEncoder().encode(STORAGE_ID_INFO),
    },
    baseKey,
    256
  )

  const encryptionKeyBits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new Uint8Array(0),
      info: new TextEncoder().encode(ENCRYPTION_KEY_INFO),
    },
    baseKey,
    256
  )

  const anonymousId = Array.from(new Uint8Array(storageIdBits))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  const encryptionKey = await crypto.subtle.importKey(
    'raw',
    encryptionKeyBits,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )

  return { anonymousId, encryptionKey }
}

/**
 * Encrypts backup data with AES-256-GCM. IV is prepended to ciphertext.
 */
export async function encryptBackup(
  data: string,
  key: CryptoKey
): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(data)
  )
  const combined = new Uint8Array(iv.length + encrypted.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(encrypted), iv.length)
  return uint8ToBase64(combined)
}

/**
 * Decrypts backup data. Expects base64 string of iv || ciphertext (with auth tag).
 */
export async function decryptBackup(
  ciphertext: string,
  key: CryptoKey
): Promise<string> {
  const combined = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0))
  const iv = combined.slice(0, IV_LENGTH)
  const encrypted = combined.slice(IV_LENGTH)
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encrypted
  )
  return new TextDecoder().decode(decrypted)
}
