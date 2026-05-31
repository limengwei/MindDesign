import { App, Leafer, PropertyEvent } from 'leafer-ui'

export interface DotGridConfig {
  dotColor?: string
  dotSize?: number
  gridGap?: number
  bgColor?: string
  hoverRadius?: number
  hoverColor?: string
  hoverDotScale?: number
}

const DEFAULT_CONFIG: Required<DotGridConfig> = {
  dotColor: 'rgba(255,255,255,0.08)',
  dotSize: 1.5,
  gridGap: 24,
  bgColor: '#0f0f23',
  hoverRadius: 120,
  hoverColor: 'rgba(129,140,248,0.6)',
  hoverDotScale: 2.5,
}

export class DotGrid {
  private app: App
  private layer: Leafer
  private config: Required<DotGridConfig>
  private rafId = 0
  private dirty = true
  private mouseX = -9999
  private mouseY = -9999
  private smoothMouseX = -9999
  private smoothMouseY = -9999
  private mouseInside = false
  private animating = false
  private boundMouseMove: (e: MouseEvent) => void
  private boundMouseEnter: () => void
  private boundMouseLeave: () => void
  private boundZoomChange: (e: any) => void
  private _resizeObserver: ResizeObserver | null = null

  constructor(container: HTMLElement, app: App, config?: DotGridConfig) {
    this.app = app
    this.config = { ...DEFAULT_CONFIG, ...config }

    // 用 LeaferJS 内部 Leafer 实例，不创建独立 DOM canvas
    this.layer = new Leafer({ hittable: false })

    // 插入到 ground 之前（最底层），不影响 tree 层的渲染
    if (app.ground) {
      app.addBefore(this.layer, app.ground)
    } else {
      app.addAt(this.layer, 0)
    }

    this.boundMouseMove = this.onMouseMove.bind(this)
    this.boundMouseEnter = this.onMouseEnter.bind(this)
    this.boundMouseLeave = this.onMouseLeave.bind(this)
    this.boundZoomChange = (e: any) => {
      if (e.attrName === 'x' || e.attrName === 'y' || e.attrName === 'scaleX' || e.attrName === 'scaleY') {
        this.scheduleRedraw()
      }
    }

    const zoomLayer = this.app.tree?.zoomLayer
    if (zoomLayer) {
      zoomLayer.on(PropertyEvent.CHANGE, this.boundZoomChange)
    }

    container.addEventListener('mousemove', this.boundMouseMove)
    container.addEventListener('mouseenter', this.boundMouseEnter)
    container.addEventListener('mouseleave', this.boundMouseLeave)

    this._resizeObserver = new ResizeObserver(() => this.scheduleRedraw())
    this._resizeObserver.observe(container)

    setTimeout(() => this.redraw(), 100)
  }

  private onMouseMove(e: MouseEvent) {
    const rect = this.app.view.getBoundingClientRect()
    this.mouseX = e.clientX - rect.left
    this.mouseY = e.clientY - rect.top
    if (!this.mouseInside) {
      this.mouseInside = true
      this.smoothMouseX = this.mouseX
      this.smoothMouseY = this.mouseY
    }
    this.startHoverAnimation()
  }

  private onMouseEnter() { this.mouseInside = true }
  private onMouseLeave() { this.mouseInside = false; this.startHoverAnimation() }

  private startHoverAnimation() {
    if (this.animating) return
    this.animating = true
    this.tickHover()
  }

  private tickHover() {
    const targetX = this.mouseInside ? this.mouseX : -9999
    const targetY = this.mouseInside ? this.mouseY : -9999
    const lerp = 0.25
    const dx = targetX - this.smoothMouseX
    const dy = targetY - this.smoothMouseY
    this.smoothMouseX += dx * lerp
    this.smoothMouseY += dy * lerp
    this.redraw()
    if (this.mouseInside || Math.sqrt(dx * dx + dy * dy) > 1) {
      requestAnimationFrame(() => this.tickHover())
    } else {
      this.animating = false
      this.smoothMouseX = -9999; this.smoothMouseY = -9999
    }
  }

  private scheduleRedraw() {
    if (this.rafId) return
    this.dirty = true
    this.rafId = requestAnimationFrame(() => { this.rafId = 0; if (this.dirty) this.redraw() }) as any
  }

  private redraw() {
    this.dirty = false
    const canvas = this.layer.canvas
    const ctx = canvas?.context
    if (!ctx) return

    const w = canvas.width
    const h = canvas.height
    if (!w || !h) return

    this.layer.canvas.setWorld({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })
    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = this.config.bgColor
    ctx.fillRect(0, 0, w, h)

    const zoomLayer = this.app.tree?.zoomLayer
    if (!zoomLayer) return

    const scale = zoomLayer.scaleX ?? 1
    const offsetX = zoomLayer.x ?? 0
    const offsetY = zoomLayer.y ?? 0

    const baseGap = this.config.gridGap
    const dotSize = this.config.dotSize

    let gap = baseGap * scale
    while (gap < 10) gap *= 5
    while (gap > 120) gap /= 5

    const dotAlpha = Math.min(1, Math.max(0.15, (gap / 40) * 0.6))
    const actualDotSize = Math.max(0.5, dotSize * Math.min(1.5, gap / 30))

    const startX = ((offsetX) % gap + gap) % gap
    const startY = ((offsetY) % gap + gap) % gap

    const hoverR = this.config.hoverRadius
    const hoverR2 = hoverR * hoverR
    const hoverDotScale = this.config.hoverDotScale
    const hoverColor = this.config.hoverColor

    const mx = this.smoothMouseX
    const my = this.smoothMouseY
    const hasHover = mx > -999 && my > -999

    const hoverMargin = hasHover ? hoverR + gap : 0
    const xMin = hasHover ? (mx - hoverMargin) : Infinity
    const xMax = hasHover ? (mx + hoverMargin) : -Infinity
    const yMin = hasHover ? (my - hoverMargin) : Infinity
    const yMax = hasHover ? (my + hoverMargin) : -Infinity

    ctx.fillStyle = this.config.dotColor
    ctx.globalAlpha = dotAlpha

    for (let x = startX; x < w; x += gap) {
      for (let y = startY; y < h; y += gap) {
        if (hasHover && x >= xMin && x <= xMax && y >= yMin && y <= yMax) {
          const ddx = x - mx, ddy = y - my
          const dist2 = ddx * ddx + ddy * ddy
          if (dist2 < hoverR2) {
            const t = 1 - Math.sqrt(dist2) / hoverR
            const eased = t * t
            ctx.globalAlpha = dotAlpha + eased * (1 - dotAlpha)
            ctx.fillStyle = hoverColor
            ctx.beginPath()
            ctx.arc(x, y, actualDotSize * (1 + (hoverDotScale - 1) * eased), 0, Math.PI * 2)
            ctx.fill()
            ctx.fillStyle = this.config.dotColor
            ctx.globalAlpha = dotAlpha
            continue
          }
        }
        ctx.beginPath()
        ctx.arc(x, y, actualDotSize, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.globalAlpha = 1
  }

  destroy() {
    if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = 0 }
    this.animating = false
    const zoomLayer = this.app.tree?.zoomLayer
    if (zoomLayer) zoomLayer.off(PropertyEvent.CHANGE, this.boundZoomChange)
    this._resizeObserver?.disconnect()
    this._resizeObserver = null
    this.layer.destroy()
  }
}
