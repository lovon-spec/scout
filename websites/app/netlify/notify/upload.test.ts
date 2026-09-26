import { after, afterEach, before, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { PGlite } from '@electric-sql/pglite'
import { privateKeyToAccount } from 'viem/accounts'
import { createSiweMessage } from 'viem/siwe'
import { createApi } from './api'
import type { Chain } from './chain'
import type { Db } from './db'
import type { NotifyEnv } from './env'
import { migrate } from './migrations'
import { pgliteDb } from './pglite'
import { createService } from './service'
import * as store from './store'
import { recordUpload } from './upload'

let pg: PGlite
let db: Db
before(async () => {
  pg = new PGlite()
  db = pgliteDb(pg)
  await migrate(db)
})
after(async () => pg.close())
beforeEach(async () => {
  await db.query(`truncate users, uploads restart identity cascade`)
})
const realFetch = globalThis.fetch
afterEach(() => {
  globalThis.fetch = realFetch
})

const env: NotifyEnv = {
  databaseUrl: 'pglite',
  sessionSecret: 'x'.repeat(40),
  siteUrl: 'https://scout.test',
  indexerUrl: 'https://indexer.test/graphql',
  gnosisRpcUrls: ['https://rpc.test'],
  mainnetRpcUrls: ['https://rpc.test'],
  ipfs: { pinataJwt: 'pinata-test-jwt' },
}
const account = privateKeyToAccount(
  '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
)
const CID = 'bafkreigh2akiscaildcqabsyg3dfr6chu3fgpregiymsck7e7aqa4s52zy'

const api = (overrides: Partial<NotifyEnv> = {}) =>
  createApi(createService({ ...env, ...overrides }, db, { chain: {} as Chain }))

const cookiesOf = (response: Response) =>
  response.headers
    .getSetCookie()
    .map((c) => c.split(';')[0])
    .join('; ')

const signIn = async (handle: (r: Request) => Promise<Response>) => {
  const nonce = await handle(
    new Request('https://scout.test/api/notify/auth/nonce'),
  )
  const message = createSiweMessage({
    domain: 'scout.test',
    address: account.address,
    uri: 'https://scout.test',
    version: '1',
    chainId: 100,
    nonce: (await nonce.json()).nonce,
    issuedAt: new Date(),
  })
  const verified = await handle(
    new Request('https://scout.test/api/notify/auth/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://scout.test',
        Cookie: cookiesOf(nonce),
      },
      body: JSON.stringify({
        message,
        signature: await account.signMessage({ message }),
      }),
    }),
  )
  assert.equal(verified.status, 200)
  return cookiesOf(verified)
}

// A multipart request as a browser sends it, with its length.
const upload = async (
  handle: (r: Request) => Promise<Response>,
  cookie: string,
  file: File,
  role: string,
) => {
  const form = new FormData()
  form.append('file', file, file.name)
  form.append('role', role)
  const encoded = new Response(form)
  const body = await encoded.arrayBuffer()
  const response = await handle(
    new Request('https://scout.test/api/notify/upload', {
      method: 'POST',
      headers: {
        'Content-Type': encoded.headers.get('content-type') ?? '',
        'Content-Length': String(body.byteLength),
        Origin: 'https://scout.test',
        Cookie: cookie,
      },
      body,
    }),
  )
  return { status: response.status, data: await response.json() }
}

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1])
const png = (bytes: Uint8Array = PNG) =>
  new File([bytes as BlobPart], 'logo.png', { type: 'image/png' })

// Pinata's upload endpoint, answering with a CID.
const mockPinata = (status = 200) => {
  const calls: { auth: string | null; form: FormData }[] = []
  globalThis.fetch = (async (input: string | URL, init?: RequestInit) => {
    assert.equal(String(input), 'https://uploads.pinata.cloud/v3/files')
    calls.push({
      auth: new Headers(init?.headers).get('Authorization'),
      form: init?.body as FormData,
    })
    return new Response(JSON.stringify({ data: { cid: CID } }), { status })
  }) as typeof fetch
  return calls
}

describe('uploads', () => {
  it("pins a signed-in user's file and returns its IPFS path", async () => {
    const handle = api()
    const cookie = await signIn(handle)
    const calls = mockPinata()
    const logo = await upload(handle, cookie, png(), 'logo')
    assert.deepEqual(logo, { status: 200, data: { path: `/ipfs/${CID}` } })
    assert.equal(calls[0].auth, 'Bearer pinata-test-jwt')
    assert.equal(calls[0].form.get('network'), 'public')
    const item = new File([JSON.stringify({ columns: [] })], 'item.json', {
      type: 'application/json',
    })
    assert.equal(
      (await upload(handle, cookie, item, 'curate-item-file')).status,
      200,
    )
  })

  it('needs a session, and a deployment with uploads set up', async () => {
    mockPinata()
    assert.equal((await upload(api(), '', png(), 'logo')).status, 401)
    const unset = api({ ipfs: undefined })
    const cookie = await signIn(unset)
    const refused = await upload(unset, cookie, png(), 'logo')
    assert.equal(refused.status, 503)
  })

  it("enforces each role's types, sizes and contents", async () => {
    const handle = api()
    const cookie = await signIn(handle)
    const calls = mockPinata()
    const refused = async (file: File, role: string) =>
      (await upload(handle, cookie, file, role)).status
    assert.equal(await refused(png(), 'policy'), 400)
    const svg = new File(['<svg/>'], 'logo.svg', { type: 'image/svg+xml' })
    assert.equal(await refused(svg, 'logo'), 415)
    const big = new Uint8Array(1024 * 1024 + 1)
    big.set(PNG)
    assert.equal(await refused(png(big), 'logo'), 413)
    assert.equal(await refused(png(new Uint8Array([1, 2, 3])), 'logo'), 415)
    const notJson = new File(['{oops'], 'item.json', {
      type: 'application/json',
    })
    assert.equal(await refused(notJson, 'curate-item-file'), 415)
    assert.equal(calls.length, 0)
  })

  it('reports the pinning service failing', async () => {
    const handle = api()
    const cookie = await signIn(handle)
    mockPinata(500)
    assert.equal((await upload(handle, cookie, png(), 'logo')).status, 502)
  })

  it('limits uploads per user, per hour and in bytes per day', async () => {
    const user = await store.upsertUser(db, account.address)
    const limits = { perHour: 2, bytesPerDay: 1000 }
    assert.equal(await recordUpload(db, user.id, 100, limits), true)
    assert.equal(await recordUpload(db, user.id, 100, limits), true)
    assert.equal(await recordUpload(db, user.id, 100, limits), false)
    await db.query(`update uploads set created_at = now() - interval '2 hours'`)
    assert.equal(await recordUpload(db, user.id, 850, limits), false)
    assert.equal(await recordUpload(db, user.id, 800, limits), true)
  })
})
