import { App, Canvas, PropertyEvent } from 'leafer-ui'
import type { ILeafer } from '@leafer-ui/interface'

export interface DotGridConfig {
  dotColor?: string
  dotSize?: number
  gridGap?: number
  bgColor?: string
}

const DEFAULT_CONFIG: Required<DotGridConfig> = {
  dotColor: 'rgba(255,255,255,0.08)',
  dotSize: 1.5,
  gridGap: 24,
  bgColor: '#0f0f23',
}

export class DotGrid {
  private app: App
  private config: Required<DotGridConfig>
  private ground: ILeafer | null = null
  private canvas: Canvas | null = null
  private rafId = 0
  private dirty = true

  constructor(app: App, config?: DotGridConfig) {
    this.app = app
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.setup()
  }

  private setup() {
    this.ground = this.app.ground ?? null
    if (!this.ground) return

    this.canvas = new Canvas({
      width: 1,
      height: 1,
      fill: this.config.bgColor,
    })
    ;(this.ground as any).add(this.canvas)

    const zoomLayer = this.app.tree?.zoomLayer
    if (zoomLayer) {
      zoomLayer.on(PropertyEvent.CHANGE, (e: any) => {
        if (
          e.attrName === 'x' ||
          e.attrName === 'y' ||
          e.attrName === 'scaleX' ||
          e.attrName === 'scaleY'
        ) {
          this.scheduleRedraw()
        }
      })
    }

    this.app.on('resize', () => this.scheduleRedraw())
    this.dirty = true
    this.redraw()
  }

  private scheduleRedraw() {
    if (this.rafId) return
    this.dirty = true
    this.rafId = requestAnimationFrame(() => {
      this.rafId = 0
      if (this.dirty) this.redraw()
    }) as any
  }

  private redraw() {
    this.dirty = false
    if (!this.canvas) return

    const view = this.app.view as HTMLElement
    const w = view?.clientWidth ?? window.innerWidth
    const h = view?.clientHeight ?? window.innerHeight
    const dpr = window.devicePixelRatio || 1

    this.canvas.width = w
    this.canvas.height = h

    const ctx = (this.canvas as any).context as CanvasRenderingContext2D
    if (!ctx) return

    ctx.clearRect(0, 0, w * dpr, h * dpr)
    ctx.fillStyle = this.config.bgColor
    ctx.fillRect(0, 0, w * dpr, h * dpr)

    const zoomLayer = this.app.tree?.zoomLayer
    if (!zoomLayer) return

    const scale = zoomLayer.scaleX ?? 1
    const offsetX = (zoomLayer.x ?? 0) * dpr
    const offsetY = (zoomLayer.y ?? 0) * dpr

    const baseGap = this.config.gridGap
    const dotSize = this.config.dotSize * dpr

    let gap = baseGap * scale * dpr
    while (gap < 10) gap *= 5
    while (gap > 120) gap /= 5

    const dotAlpha = Math.min(1, Math.max(0.15, (gap / 40) * 0.6))
    const actualDotSize = Math.max(0.5, dotSize * Math.min(1.5, gap / 30))

    ctx.fillStyle = this.config.dotColor
    ctx.globalAlpha = dotAlpha

    const startX = offsetX % gap
    const startY = offsetY % gap

    for (let x = startX; x < w * dpr; x += gap) {
      for (let y = startY; y < h * dpr; y += gap) {
        ctx.beginPath()
        ctx.arc(x, y, actualDotSize, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    ctx.globalAlpha = 1
  }

  destroy() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId)
      this.rafId = 0
    }
    this.canvas?.remove()
    this.canvas = null
    this.ground = null
  }
}
