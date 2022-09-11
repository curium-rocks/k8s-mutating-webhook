import { inject, injectable } from 'inversify'
import { TYPES } from '../types'
import { Logger } from 'pino'

export interface IAdmission {
  allowAdmission(containerImages: string[]): Promise<boolean>
}

@injectable()
export class Admission implements IAdmission {
  private readonly allowedImages: Set<string>
  private readonly blockedImages: Set<string>
  private readonly strictMode: boolean
  private readonly logger: Logger

  constructor (
    @inject(TYPES.Services.Logging)parentLogger: Logger,
    @inject(TYPES.Config.AllowedList)allowedImages: string[],
    @inject(TYPES.Config.BlockedList)blockedImages: string[],
    @inject(TYPES.Config.StrictMode)strictMode: boolean) {
    this.logger = parentLogger.child({ module: 'services/Admission' })
    this.allowedImages = new Set(allowedImages.map((s) => s.toLowerCase()))
    this.blockedImages = new Set(blockedImages.map((s) => s.toLowerCase()))
    this.strictMode = strictMode
    this.logger.info('loaded with {strictMode=%s, allowedImageCount=%d, blockedImageCount=%d, allowedImages=%j, blockImages=%j}', this.strictMode, this.allowedImages.size, this.blockedImages.size, Array.from(this.allowedImages), Array.from(this.blockedImages))
  }

  async allowAdmission (containerImages: string[]): Promise<boolean> {
    for (const idx in containerImages) {
      const imageName = containerImages[idx].toLowerCase()
      if (this.blockedImages.has(imageName)) return Promise.resolve(false)
      if (this.strictMode && !this.allowedImages.has(imageName)) return Promise.resolve(false)
    }
    return Promise.resolve(true)
  }
}
