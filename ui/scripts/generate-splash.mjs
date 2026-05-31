import { writeFile, mkdir } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')
const outDir = join(projectRoot, 'public', 'splash')

const BG = '#0f172a'
const ICON_FILL = '#818cf8'
const TEXT_COLOR = '#ffffff'
const LABEL = 'Inventory'

const DEVICES = [
  { w: 640, h: 1136, ratio: 2 }, // iPhone SE (1st gen) / 5/5s
  { w: 750, h: 1334, ratio: 2 }, // iPhone SE (2nd/3rd), 6/7/8
  { w: 828, h: 1792, ratio: 2 }, // iPhone XR, 11
  { w: 1080, h: 2340, ratio: 3 }, // iPhone 12/13 mini
  { w: 1125, h: 2436, ratio: 3 }, // iPhone X, XS, 11 Pro
  { w: 1170, h: 2532, ratio: 3 }, // iPhone 12, 13, 14
  { w: 1179, h: 2556, ratio: 3 }, // iPhone 14 Pro, 15, 16
  { w: 1242, h: 2208, ratio: 3 }, // iPhone 6+/7+/8+
  { w: 1242, h: 2688, ratio: 3 }, // iPhone XS Max, 11 Pro Max
  { w: 1284, h: 2778, ratio: 3 }, // iPhone 12/13/14 Plus / Pro Max
  { w: 1290, h: 2796, ratio: 3 }, // iPhone 14 Pro Max, 15 Pro Max, 16 Pro
  { w: 1488, h: 2266, ratio: 2 }, // iPad mini 6
  { w: 1536, h: 2048, ratio: 2 }, // iPad 9.7 / mini 4-5
  { w: 1620, h: 2160, ratio: 2 }, // iPad 10.2 (7-9 gen)
  { w: 1640, h: 2360, ratio: 2 }, // iPad Air 10.9 / iPad 10
  { w: 1668, h: 2224, ratio: 2 }, // iPad Pro 10.5
  { w: 1668, h: 2388, ratio: 2 }, // iPad Pro 11 / Air 11 M2
  { w: 2048, h: 2732, ratio: 2 }, // iPad Pro 12.9 / Air 13 M2
]

const ICON_PATH =
  'M11.2174 3.55279C11.7101 3.30646 12.29 3.30646 12.7826 3.55279L19.7826 7.05274C20.3755 7.34917 20.75 7.95514 20.75 8.61799V20C20.75 20.4142 20.4142 20.75 20 20.75C19.5858 20.75 19.25 20.4142 19.25 20V8.61799C19.25 8.5233 19.1965 8.43673 19.1118 8.39438L12.1118 4.89444C12.0415 4.85924 11.9586 4.85924 11.8882 4.89443L4.88823 8.39438C4.80353 8.43673 4.75003 8.5233 4.75003 8.61799V20C4.75003 20.4142 4.41424 20.75 4.00003 20.75C3.58582 20.75 3.25003 20.4142 3.25003 20V8.61799C3.25003 7.95514 3.62454 7.34917 4.21742 7.05274L11.2174 3.55279ZM6.25003 12C6.25003 11.0335 7.03353 10.25 8.00003 10.25H16C16.9665 10.25 17.75 11.0335 17.75 12V19C17.75 19.9665 16.9665 20.75 16 20.75H8.00003C7.03353 20.75 6.25003 19.9665 6.25003 19V12ZM8.00003 11.75C7.86196 11.75 7.75003 11.8619 7.75003 12V13.25H16.25V12C16.25 11.8619 16.1381 11.75 16 11.75H8.00003ZM16.25 14.75H7.75003V16.25H16.25V14.75ZM16.25 17.75H7.75003V19C7.75003 19.138 7.86196 19.25 8.00003 19.25H16C16.1381 19.25 16.25 19.138 16.25 19V17.75Z'

function buildSvg(width, height) {
  const minEdge = Math.min(width, height)
  const iconSize = Math.round(minEdge * 0.12)
  const fontSize = Math.round(minEdge * 0.075)
  const gap = Math.round(minEdge * 0.025)

  const textWidth = Math.round(LABEL.length * fontSize * 0.55)
  const totalWidth = iconSize + gap + textWidth
  const startX = Math.round((width - totalWidth) / 2)
  const centerY = Math.round(height / 2)

  const iconX = startX
  const iconY = centerY - iconSize / 2
  const textX = startX + iconSize + gap
  const textY = Math.round(centerY + fontSize * 0.28)

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="${BG}"/>
  <g transform="translate(${iconX} ${iconY}) scale(${iconSize / 24})">
    <path d="${ICON_PATH}" fill="${ICON_FILL}" fill-rule="evenodd" clip-rule="evenodd"/>
  </g>
  <text x="${textX}" y="${textY}" fill="${TEXT_COLOR}"
        font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        font-weight="600" font-size="${fontSize}" letter-spacing="-0.5">${LABEL}</text>
</svg>`
}

await mkdir(outDir, { recursive: true })

const links = []

for (const { w, h, ratio } of DEVICES) {
  for (const orientation of ['portrait', 'landscape']) {
    const width = orientation === 'portrait' ? w : h
    const height = orientation === 'portrait' ? h : w
    const svg = buildSvg(width, height)
    const filename = `apple-splash-${width}-${height}.png`
    const dest = join(outDir, filename)

    await sharp(Buffer.from(svg)).png().toFile(dest)
    console.log('  •', filename)

    const cssW = orientation === 'portrait' ? w / ratio : h / ratio
    const cssH = orientation === 'portrait' ? h / ratio : w / ratio
    const media = `(device-width: ${cssW}px) and (device-height: ${cssH}px) and (-webkit-device-pixel-ratio: ${ratio}) and (orientation: ${orientation})`
    links.push(`<link rel="apple-touch-startup-image" href="/splash/${filename}" media="${media}" />`)
  }
}

const markupPath = join(__dirname, 'splash-markup.html')
await writeFile(markupPath, links.join('\n') + '\n')

console.log(`\nWrote ${links.length} link tags to ${markupPath}`)
console.log('Paste them into index.html between the existing <link> tags and <title>.')
