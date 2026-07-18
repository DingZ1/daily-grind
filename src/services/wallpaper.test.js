import { describe, expect, it } from 'vitest'
import { validateWallpaper } from './wallpaper'

describe('lock wallpaper validation', () => {
  it('accepts supported image formats under 5 MB', () => {
    const file = new File(['image'], 'wallpaper.webp', { type: 'image/webp' })
    expect(() => validateWallpaper(file)).not.toThrow()
  })

  it('rejects unsupported files', () => {
    const file = new File(['text'], 'wallpaper.svg', { type: 'image/svg+xml' })
    expect(() => validateWallpaper(file)).toThrow('仅支持 JPEG、PNG 或 WebP 图片。')
  })

  it('rejects images larger than 5 MB', () => {
    const file = { type: 'image/jpeg', size: 5 * 1024 * 1024 + 1 }
    expect(() => validateWallpaper(file)).toThrow('锁屏壁纸不能超过 5 MB。')
  })
})
