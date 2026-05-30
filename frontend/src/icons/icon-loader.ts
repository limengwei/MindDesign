import { Image } from 'leafer-ui'

const svgCache = new Map<string, string>()

export async function loadIconSvg(name: string): Promise<string> {
  if (svgCache.has(name)) {
    return svgCache.get(name)!
  }
  const resp = await fetch(`/icons/${name}.svg`)
  if (!resp.ok) {
    console.warn(`Icon not found: ${name}`)
    return ''
  }
  const svg = await resp.text()
  svgCache.set(name, svg)
  return svg
}

export function colorizeSvg(svg: string, color: string): string {
  return svg.replace(/fill="[^"]*"/g, `fill="${color}"`)
}

export async function createLeaferIcon(
  name: string,
  size: number,
  color: string
): Promise<Image> {
  const svg = await loadIconSvg(name)
  if (!svg) {
    return new Image({ width: size, height: size })
  }
  const colored = colorizeSvg(svg, color)
  const b64 = btoa(unescape(encodeURIComponent(colored)))
  return new Image({
    url: `data:image/svg+xml;base64,${b64}`,
    width: size,
    height: size,
  })
}

export function getSvgCache(name: string): string | undefined {
  return svgCache.get(name)
}
