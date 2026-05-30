import { App, PropertyEvent } from 'leafer-ui'

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
  private container: HTMLElement
  private app: App
  private config: Required<DotGridConfig>
  private el: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null
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
  private boundResize: () => void
  private boundContainerResize: ResizeObserverCallback

  constructor(container: HTMLElement, app: App, config?: DotGridConfig) {
    this.container = container
    this.app = app
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.boundMouseMove = this.onMouseMove.bind(this)
    this.boundMouseEnter = this.onMouseEnter.bind(this)
    this.boundMouseLeave = this.onMouseLeave.bind(this)
    this.boundZoomChange = (e: any) => {
      if (
        e.attrName === 'x' ||
        e.attrName === 'y' ||
        e.attrName === 'scaleX' ||
        e.attrName === 'scaleY'
      ) {
        this.scheduleRedraw()
      }
    }
    this.boundResize = () => this.scheduleRedraw()
    this.boundContainerResize = () => this.handleResize()
    this.setup()
  }

  private setup() {
    this.el = document.createElement('canvas')
    this.el.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0;'
    this.container.insertBefore(this.el, this.container.firstChild)

    this.ctx = this.el.getContext('2d')

    const zoomLayer = this.app.tree?.zoomLayer
    if (zoomLayer) {
      zoomLayer.on(PropertyEvent.CHANGE, this.boundZoomChange)
    }

    this.app.on('resize', this.boundResize)

    this.container.addEventListener('mousemove', this.boundMouseMove)
    this.container.addEventListener('mouseenter', this.boundMouseEnter)
    this.container.addEventListener('mouseleave', this.boundMouseLeave)

    const ro = new ResizeObserver(this.boundContainerResize)
    ro.observe(this.container)
    ;(this as any)._resizeObserver = ro

    this.handleResize()
    this.dirty = true
    this.redraw()
  }

  private handleResize() {
    if (!this.el) return
    const w = this.container.clientWidth
    const h = this.container.clientHeight
    const dpr = window.devicePixelRatio || 1
    this.el.width = w * dpr
    this.el.height = h * dpr
    this.scheduleRedraw()
  }

  private onMouseMove(e: MouseEvent) {
    const rect = this.container.getBoundingClientRect()
    this.mouseX = e.clientX - rect.left
    this.mouseY = e.clientY - rect.top
    if (!this.mouseInside) {
      this.mouseInside = true
      this.smoothMouseX = this.mouseX
      this.smoothMouseY = this.mouseY
    }
    this.startHoverAnimation()
  }

  private onMouseEnter() {
    this.mouseInside = true
  }

  private onMouseLeave() {
    this.mouseInside = false
    this.startHoverAnimation()
  }

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
    const dist = Math.sqrt(dx * dx + dy * dy)

    this.smoothMouseX += dx * lerp
    this.smoothMouseY += dy * lerp

    this.redraw()

    if (this.mouseInside || dist > 1) {
      requestAnimationFrame(() => this.tickHover())
    } else {
      this.animating = false
      this.smoothMouseX = -9999
      this.smoothMouseY = -9999
    }
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
    if (!this.el || !this.ctx) return

    const dpr = window.devicePixelRatio || 1
    const w = this.container.clientWidth
    const h = this.container.clientHeight

    const ctx = this.ctx
    ctx.clearRect(0, 0, this.el.width, this.el.height)
    ctx.fillStyle = this.config.bgColor
    ctx.fillRect(0, 0, this.el.width, this.el.height)

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

    const startX = offsetX % gap
    const startY = offsetY % gap

    const hoverR = this.config.hoverRadius * dpr
    const hoverR2 = hoverR * hoverR
    const hoverDotScale = this.config.hoverDotScale

    const mx = this.smoothMouseX * dpr
    const my = this.smoothMouseY * dpr
    const hasHover = mx > -999 && my > -999

    const hoverColor = this.config.hoverColor

    const hoverMargin = hasHover ? hoverR + gap : 0
    const xMin = hasHover ? (mx - hoverMargin) : Infinity
    const xMax = hasHover ? (mx + hoverMargin) : -Infinity
    const yMin = hasHover ? (my - hoverMargin) : Infinity
    const yMax = hasHover ? (my + hoverMargin) : -Infinity

    ctx.fillStyle = this.config.dotColor
    ctx.globalAlpha = dotAlpha

    for (let x = startX; x < w * dpr; x += gap) {
      for (let y = startY; y < h * dpr; y += gap) {
        if (hasHover && x >= xMin && x <= xMax && y >= yMin && y <= yMax) {
          const ddx = x - mx
          const ddy = y - my
          const dist2 = ddx * ddx + ddy * ddy
          if (dist2 < hoverR2) {
            const t = 1 - Math.sqrt(dist2) / hoverR
            const eased = t * t
            const hSize = actualDotSize * (1 + (hoverDotScale - 1) * eased)
            const alpha = dotAlpha + eased * (1 - dotAlpha)
            ctx.globalAlpha = alpha
            ctx.fillStyle = hoverColor
            ctx.beginPath()
            ctx.arc(x, y, hSize, 0, Math.PI * 2)
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
    if (this.rafId) {
      cancelAnimationFrame(this.rafId)
      this.rafId = 0
    }
    this.animating = false

    const zoomLayer = this.app.tree?.zoomLayer
    if (zoomLayer) {
      zoomLayer.off(PropertyEvent.CHANGE, this.boundZoomChange)
    }
    this.app.off('resize', this.boundResize)

    this.container.removeEventListener('mousemove', this.boundMouseMove)
    this.container.removeEventListener('mouseenter', this.boundMouseEnter)
    this.container.removeEventListener('mouseleave', this.boundMouseLeave)

    ;(this as any)._resizeObserver?.disconnect()
    ;(this as any)._resizeObserver = null

    this.el?.remove()
    this.el = null
    this.ctx = null
  }
}
