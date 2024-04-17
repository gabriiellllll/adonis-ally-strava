import type { AllyUserContract } from '@ioc:Adonis/Addons/Ally'
import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { Oauth2Driver, ApiRequest } from '@adonisjs/ally/build/standalone'

export type StravaAccessToken = {
  token: string
  type: 'bearer'
}

export type StravaScopes =
  | 'read'
  | 'read_all'
  | 'profile:read_all'
  | 'profile:write'
  | 'activity:read'
  | 'activity:read_all'
  | 'activity:write'

export type StravaDriverConfig = {
  driver: 'StravaDriver'
  stravaUrl?: string
  clientId: string
  clientSecret: string
  callbackUrl: string
  authorizeUrl?: string
  accessTokenUrl?: string
  userInfoUrl?: string
  scopes?: StravaScopes[]
}

export class StravaDriver extends Oauth2Driver<StravaAccessToken, StravaScopes> {
  protected authorizeUrl = 'https://www.strava.com/oauth/authorize'
  protected accessTokenUrl = 'https://www.strava.com/api/v3/oauth/token'
  protected userInfoUrl = 'https://www.strava.com/api/v3/athlete'
  protected codeParamName = 'code'
  protected errorParamName = 'error'
  protected stateCookieName = 'strava_oauth_state'
  protected stateParamName = 'state'
  protected scopeParamName = 'scope'
  protected scopesSeparator = ','

  constructor(ctx: HttpContextContract, public config: StravaDriverConfig) {
    super(ctx, config)
    this.loadState()
  }

  public accessDenied() {
    return this.ctx.request.input('error') === 'user_denied'
  }
  public async user(
    callback?: (request: ApiRequest) => void
  ): Promise<AllyUserContract<StravaAccessToken>> {
    const accessToken = await this.accessToken()
    const user = await this.getUserInfo(accessToken.token, callback)

    return {
      ...user,
      token: accessToken,
    }
  }

  public async userFromToken(
    accessToken: string,
    callback?: (request: ApiRequest) => void
  ): Promise<AllyUserContract<{ token: string; type: 'bearer' }>> {
    const user = await this.getUserInfo(accessToken, callback)

    return {
      ...user,
      token: {
        token: accessToken,
        type: 'bearer' as const,
      },
    }
  }

  protected getAuthenticatedRequest(token: string) {
    const request = this.httpClient(this.config.userInfoUrl || this.userInfoUrl)

    request.header('Accept', 'application/json')
    request.header('Authorization', `Bearer ${token}`)
    request.param('format', 'json')
    request.parseAs('json')

    return request
  }

  protected async getUserInfo(
    token: string,
    callback?: (request: ApiRequest) => void
  ): Promise<Omit<AllyUserContract<StravaAccessToken>, 'token'>> {
    const request = this.getAuthenticatedRequest(token)

    if (typeof callback === 'function') {
      callback(request)
    }

    const body = await request.get()

    return {
      id: body.id,
      nickName: body.username,
      name: body.name,
      email: body.email,
      avatarUrl: body.avatar_url || null,
      emailVerificationState: body.state === 'active' ? 'verified' : 'unverified',
      original: body,
    }
  }
}
