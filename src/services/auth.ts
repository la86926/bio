import { PublicClientApplication, type AccountInfo, type AuthenticationResult } from '@azure/msal-browser'
import type { RuntimeConfig } from '../models'

const scopes = ['User.Read', 'Sites.ReadWrite.All', 'Files.ReadWrite.All']

export class MicrosoftAuth {
  private app?: PublicClientApplication
  private account?: AccountInfo

  async configure(config: RuntimeConfig): Promise<void> {
    if (!config.microsoft.enabled || !config.microsoft.clientId) return
    this.app = new PublicClientApplication({
      auth: {
        clientId: config.microsoft.clientId,
        authority: `https://login.microsoftonline.com/${config.microsoft.tenantId || 'common'}`,
        redirectUri: `${window.location.origin}${import.meta.env.BASE_URL}`
      },
      cache: { cacheLocation: 'localStorage' }
    })
    await this.app.initialize()
    this.account = this.app.getAllAccounts()[0]
  }

  isConfigured(): boolean { return Boolean(this.app) }
  getAccount(): AccountInfo | undefined { return this.account }

  async signIn(): Promise<AccountInfo> {
    if (!this.app) throw new Error('Microsoft no está configurado.')
    const result = await this.app.loginPopup({ scopes })
    this.account = result.account
    return result.account
  }

  async signOut(): Promise<void> {
    if (!this.app) return
    await this.app.logoutPopup({ account: this.account })
    this.account = undefined
  }

  async token(): Promise<string> {
    if (!this.app) throw new Error('Microsoft no está configurado.')
    if (!this.account) await this.signIn()
    let result: AuthenticationResult
    try {
      result = await this.app.acquireTokenSilent({ scopes, account: this.account! })
    } catch {
      result = await this.app.acquireTokenPopup({ scopes, account: this.account! })
    }
    return result.accessToken
  }
}

export const microsoftAuth = new MicrosoftAuth()
