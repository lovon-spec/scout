/**
 * Community Scout's IPFS uploads, in place of Kleros's Atlas: signed-in users
 * upload the files of their submissions and evidence, which are pinned with
 * the operator's Pinata account.
 */
import type { Db } from './db'
import type { NotifyEnv } from './env'
import { HttpError, json, type Handler } from './http'
import type { UserRow } from './store'
import {
  MAX_UPLOAD_REQUEST_BYTES,
  UPLOAD_ROLES,
} from '../../src/fork/uploadRoles'

/** Per user: uploads per hour, and bytes per day. */
export const UPLOAD_LIMITS = { perHour: 30, bytesPerDay: 50 * 1024 * 1024 }

/**
 * Counts an upload against the user's limits; false when it would exceed
 * them. One user's uploads are counted one at a time.
 */
export const recordUpload = async (
  db: Db,
  userId: number,
  bytes: number,
  limits = UPLOAD_LIMITS,
): Promise<boolean> =>
  db.transaction(async (tx) => {
    await tx.query(`select pg_advisory_xact_lock(7426161, $1)`, [userId])
    await tx.query(
      `delete from uploads where user_id = $1 and created_at < now() - interval '2 days'`,
      [userId],
    )
    const [used] = await tx.query<{ count: number; bytes: string }>(
      `select count(*) filter (where created_at > now() - interval '1 hour')::int as count,
              coalesce(sum(bytes) filter (where created_at > now() - interval '1 day'), 0)::bigint as bytes
         from uploads where user_id = $1`,
      [userId],
    )
    if (
      used.count >= limits.perHour ||
      Number(used.bytes) + bytes > limits.bytesPerDay
    )
      return false
    await tx.query(`insert into uploads (user_id, bytes) values ($1, $2)`, [
      userId,
      bytes,
    ])
    return true
  })

const startsWith = (bytes: Uint8Array, prefix: number[], offset = 0) =>
  prefix.every((b, i) => bytes[offset + i] === b)
const ascii = (text: string) => [...text].map((c) => c.charCodeAt(0))

/** Whether a file's bytes are what its declared type says. */
export const contentMatchesType = async (file: File): Promise<boolean> => {
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer())
  switch (file.type) {
    case 'image/png':
      return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    case 'image/jpeg':
      return startsWith(bytes, [0xff, 0xd8, 0xff])
    case 'image/gif':
      return startsWith(bytes, ascii('GIF8'))
    case 'image/webp':
      return (
        startsWith(bytes, ascii('RIFF')) && startsWith(bytes, ascii('WEBP'), 8)
      )
    case 'application/pdf':
      return startsWith(bytes, ascii('%PDF-'))
    case 'application/json':
      try {
        JSON.parse(await file.text())
        return true
      } catch {
        return false
      }
    case 'text/plain':
      try {
        new TextDecoder('utf-8', { fatal: true }).decode(
          await file.arrayBuffer(),
        )
        return true
      } catch {
        return false
      }
    default:
      return false
  }
}

/** Pins a file with Pinata; returns its CID. */
export const pinWithPinata = async (jwt: string, file: File) => {
  const form = new FormData()
  form.append('file', file, file.name)
  form.append('network', 'public')
  const response = await fetch('https://uploads.pinata.cloud/v3/files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${jwt}` },
    body: form,
    signal: AbortSignal.timeout(20_000),
  }).catch(() => null)
  const body = await response?.json().catch(() => null)
  const cid = body?.data?.cid
  if (!response?.ok || typeof cid !== 'string' || !/^[a-zA-Z0-9]+$/.test(cid))
    throw new HttpError(
      502,
      'The IPFS pinning service did not take the file. Try again.',
    )
  return cid
}

export const uploadRoutes = ({
  db,
  env,
  currentUser,
}: {
  db: Db
  env: NotifyEnv
  currentUser: (request: Request) => Promise<UserRow>
}): [string, string, Handler][] => [
  [
    'POST',
    '/api/notify/upload',
    async (request) => {
      const user = await currentUser(request)
      if (!env.ipfs)
        throw new HttpError(503, 'Uploads are not set up on this deployment.')
      const declared = Number(request.headers.get('content-length'))
      if (!(declared > 0) || declared > MAX_UPLOAD_REQUEST_BYTES)
        throw new HttpError(413, 'The file is too large.')
      const form = await request.formData().catch(() => null)
      const file = form?.get('file')
      const role = form?.get('role')
      const limits = typeof role === 'string' ? UPLOAD_ROLES[role] : undefined
      if (!(file instanceof File) || !limits)
        throw new HttpError(400, 'Send a file and a known upload role.')
      if (!limits.allowedMimeTypes.includes(file.type))
        throw new HttpError(415, 'Unsupported file type.')
      if (file.size === 0 || file.size > limits.maxSize)
        throw new HttpError(413, 'The file is too large.')
      if (!(await contentMatchesType(file)))
        throw new HttpError(415, "The file's contents don't match its type.")
      if (!(await recordUpload(db, user.id, file.size)))
        throw new HttpError(429, 'Upload limit reached. Try again later.')
      const cid = await pinWithPinata(env.ipfs.pinataJwt, file)
      return json({ path: `/ipfs/${cid}` })
    },
  ],
]
