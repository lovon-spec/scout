/**
 * Community Scout's stand-in for @kleros/kleros-app, the client of Kleros's
 * Atlas service, which Scout uses to sign in and to upload files to IPFS.
 * It keeps the interface the app uses: signing in reuses the notification
 * service's Sign-In with Ethereum session, and files go to our own
 * /api/notify/upload. vite.config.js and tsconfig.json resolve
 * '@kleros/kleros-app' to this file.
 */
import React, { useCallback } from 'react'
import { useAccount } from 'wagmi'
import { useNotifyProfile, useNotifySignIn } from 'hooks/useNotifications'
import { UPLOAD_ROLES } from './uploadRoles'

export enum Products {
  CourtV1 = 'CourtV1',
  CourtV2 = 'CourtV2',
  Curate = 'Curate',
  Escrow = 'Escrow',
  Governor = 'Governor',
  ProofOfHumanity = 'ProofOfHumanity',
  Reality = 'Reality',
  Test = 'Test',
}

export enum Roles {
  Evidence = 'evidence',
  Generic = 'generic',
  IdentificationVideo = 'identification-video',
  CurateItemImage = 'curate-item-image',
  CurateItemFile = 'curate-item-file',
  Logo = 'logo',
  MetaEvidence = 'meta-evidence',
  Photo = 'photo',
  Policy = 'policy',
  Test = 'test',
}

// Named by enum key, as Atlas names them and the app looks them up.
const roleRestrictions = Object.entries(Roles).flatMap(([name, role]) => {
  const limits = UPLOAD_ROLES[role]
  return limits ? [{ name, restriction: limits }] : []
})

export const AtlasProvider: React.FC<{
  config?: unknown
  children?: React.ReactNode
}> = ({ children }) => <>{children}</>

export const useAtlasProvider = () => {
  const { address } = useAccount()
  const profile = useNotifyProfile()
  const signIn = useNotifySignIn()
  const account = profile.data?.signedIn ? profile.data.address : undefined
  const { mutateAsync } = signIn

  const authoriseUser = useCallback(async () => {
    await mutateAsync()
  }, [mutateAsync])

  const uploadFile = useCallback(
    async (file: File, role: Roles): Promise<string | null> => {
      const limits = UPLOAD_ROLES[role]
      if (!limits) throw new Error('This kind of file cannot be uploaded.')
      if (!limits.allowedMimeTypes.includes(file.type))
        throw new Error('Unsupported file type.')
      if (file.size > limits.maxSize)
        throw new Error(
          `File too big. Max allowed size: ${(limits.maxSize / 1024 / 1024).toFixed(2)} MB.`,
        )
      const form = new FormData()
      form.append('file', file, file.name)
      form.append('role', role)
      const response = await fetch('/api/notify/upload', {
        method: 'POST',
        credentials: 'same-origin',
        headers: account ? { 'X-Notify-Account': account } : undefined,
        body: form,
      })
      const data = await response.json().catch(() => null)
      if (!response.ok || typeof data?.path !== 'string')
        throw new Error(
          data?.error ?? `Upload failed (HTTP ${response.status}).`,
        )
      return data.path
    },
    [account],
  )

  return {
    isVerified: Boolean(address && account === address.toLowerCase()),
    isSigningIn: signIn.isPending,
    authoriseUser,
    uploadFile,
    roleRestrictions,
  }
}

export default AtlasProvider
