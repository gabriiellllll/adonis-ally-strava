import type { ApplicationContract } from '@ioc:Adonis/Core/Application'

export default class StravaProvider {
  constructor(protected app: ApplicationContract) {}

  public async boot() {
    const Ally = this.app.container.resolveBinding('Adonis/Addons/Ally')
    const { StravaDriver } = await import('../src/Strava')

    Ally.extend('strava', (_, __, config, ctx) => {
      return new StravaDriver(ctx, config)
    })
  }
}
