import { generateMnemonic, mnemonicToSeedSync } from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english'

const STORAGE_ID_INFO = 'LibreBudget-Storage-ID-v1'
const ENCRYPTION_KEY_INFO = 'LibreBudget-Encryption-Key-v1'
const IV_LENGTH = 12
const CHUNK = 0x8000
const PIN_ITERATIONS = 200_000

function uint8ToBase64(bytes: Uint8Array): string {
  const parts: string[] = []
  for (let i = 0; i < bytes.length; i += CHUNK) {
    parts.push(String.fromCharCode(...bytes.subarray(i, i + CHUNK)))
  }
  return btoa(parts.join(''))
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/**
 * Generates a new 12-word BIP39 mnemonic for wallet creation.
 * 128 bits of entropy — the industry standard used by most hardware wallets.
 */
export function generateWallet(): string {
  return generateMnemonic(wordlist, 128)
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
    true, // extractable: needed for session persistence (export/import to sessionStorage)
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
 * Exports a CryptoKey to base64 for session persistence.
 * Only use with sessionStorage (cleared when tab closes).
 */
export async function exportKeyForSession(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey('raw', key)
  const bytes = new Uint8Array(raw)
  let binary = ''
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(binary)
}

/**
 * Imports an encryption key from base64 (restored from session or PIN-decrypted blob).
 * Extractable so it can be re-exported for sessionStorage after PIN unlock.
 */
export async function importKeyFromSession(base64: string): Promise<CryptoKey> {
  const bytes = new Uint8Array(base64ToBytes(base64))
  return crypto.subtle.importKey(
    'raw',
    bytes,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )
}

/**
 * Derives a key from a PIN using PBKDF2-SHA256.
 * Used to encrypt/decrypt the vault key for localStorage persistence.
 */
export async function deriveKeyFromPin(
  pin: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(pin),
    'PBKDF2',
    false,
    ['deriveBits']
  )
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: new Uint8Array(salt),
      iterations: PIN_ITERATIONS,
    },
    keyMaterial,
    256
  )
  return crypto.subtle.importKey(
    'raw',
    bits,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export interface WalletKeysForPin {
  anonymousId: string
  encryptionKey: CryptoKey
}

/**
 * Encrypts vault keys for localStorage persistence.
 * Returns JSON: { v: 1, salt, iv, ct } (all base64).
 */
export async function encryptVaultForPin(
  keys: WalletKeysForPin,
  pin: string
): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  const kek = await deriveKeyFromPin(pin, salt)
  const keyBase64 = await exportKeyForSession(keys.encryptionKey)
  const plaintext = new TextEncoder().encode(
    JSON.stringify({ anonymousId: keys.anonymousId, keyBase64 })
  )
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: new Uint8Array(iv) },
    kek,
    new Uint8Array(plaintext)
  )
  return JSON.stringify({
    v: 1,
    salt: uint8ToBase64(salt),
    iv: uint8ToBase64(iv),
    ct: uint8ToBase64(new Uint8Array(encrypted)),
  })
}

/**
 * Decrypts vault keys from localStorage using PIN.
 * Throws on wrong PIN or corrupt data.
 */
export async function decryptVaultWithPin(
  blob: string,
  pin: string
): Promise<{ anonymousId: string; encryptionKey: CryptoKey }> {
  const parsed = JSON.parse(blob) as { v?: number; salt?: string; iv?: string; ct?: string }
  if (parsed?.v !== 1 || !parsed.salt || !parsed.iv || !parsed.ct) {
    throw new Error('Invalid vault data')
  }
  const salt = new Uint8Array(base64ToBytes(parsed.salt))
  const iv = new Uint8Array(base64ToBytes(parsed.iv))
  const ct = new Uint8Array(base64ToBytes(parsed.ct))
  const kek = await deriveKeyFromPin(pin, salt)
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    kek,
    ct
  )
  const payload = JSON.parse(
    new TextDecoder().decode(decrypted)
  ) as { anonymousId: string; keyBase64: string }
  if (!payload?.anonymousId || !payload?.keyBase64) {
    throw new Error('Invalid vault payload')
  }
  const encryptionKey = await importKeyFromSession(payload.keyBase64)
  return { anonymousId: payload.anonymousId, encryptionKey }
}

/**
 * Decrypts backup data. Expects base64 string of iv || ciphertext (with auth tag).
 */
export async function decryptBackup(
  ciphertext: string,
  key: CryptoKey
): Promise<string> {
  const combined = new Uint8Array(
    Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0))
  )
  const iv = new Uint8Array(combined.slice(0, IV_LENGTH))
  const encrypted = new Uint8Array(combined.slice(IV_LENGTH))
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encrypted
  )
  return new TextDecoder().decode(decrypted)
}
