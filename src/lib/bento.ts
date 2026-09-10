import { Analytics } from '@bentonow/bento-node-sdk'

let bento: Analytics | null | undefined

/**
 * Lazily builds the Bento client, or null when the account isn't configured.
 * None of the BENTO_* variables are set in this project yet, locally or on
 * Vercel; a module-scope constructor with a non-null assertion would throw
 * on the missing keys and break `pnpm build` and every production deploy.
 */
export function getBento(): Analytics | null {
  if (bento !== undefined) return bento

  const publishableKey = process.env.BENTO_PUBLIC_KEY
  const secretKey = process.env.BENTO_SECRET_KEY
  const siteUuid = process.env.BENTO_SITE_ID

  if (!publishableKey || !secretKey || !siteUuid) {
    bento = null
    return bento
  }

  bento = new Analytics({
    authentication: { publishableKey, secretKey },
    siteUuid,
  })
  return bento
}
