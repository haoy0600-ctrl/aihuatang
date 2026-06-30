export type ExportResolutionLevel = '1K' | '2K' | '4K'

const EXPORT_SCALE_MAP: Record<ExportResolutionLevel, number> = {
  '1K': 1,
  '2K': 2,
  '4K': 4,
}

const EXPORT_LABEL_MAP: Record<ExportResolutionLevel, string> = {
  '1K': '1K高清',
  '2K': '2K导出',
  '4K': '4K导出',
}

const MAX_CANVAS_SIDE = 8192
const MAX_CANVAS_PIXELS = 32_000_000

export type ExportedImageBlob = {
  blob: Blob
  width: number
  height: number
  requestedScale: number
  actualScale: number
  limited: boolean
}

export function getExportResolutionLabel(resolution: ExportResolutionLevel) {
  return EXPORT_LABEL_MAP[resolution] || EXPORT_LABEL_MAP['1K']
}

export function getExportScale(resolution: ExportResolutionLevel) {
  return EXPORT_SCALE_MAP[resolution] || EXPORT_SCALE_MAP['1K']
}

function withCacheBuster(url: string) {
  return `${url}${url.includes('?') ? '&' : '?'}download_ts=${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

async function loadImage(url: string) {
  const image = new Image()
  image.crossOrigin = 'anonymous'

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve()
    image.onerror = () => reject(new Error('图片加载失败，暂时无法导出高清文件。'))
    image.src = withCacheBuster(url)
  })

  const sourceWidth = image.naturalWidth || image.width
  const sourceHeight = image.naturalHeight || image.height
  if (!sourceWidth || !sourceHeight) {
    throw new Error('原图尺寸异常，无法执行下载。')
  }

  return { image, sourceWidth, sourceHeight }
}

function getSafeScale(sourceWidth: number, sourceHeight: number, requestedScale: number) {
  const sideScale = Math.min(MAX_CANVAS_SIDE / sourceWidth, MAX_CANVAS_SIDE / sourceHeight)
  const pixelScale = Math.sqrt(MAX_CANVAS_PIXELS / (sourceWidth * sourceHeight))
  return Math.max(0.1, Math.min(requestedScale, sideScale, pixelScale))
}

export async function createExportedImageBlob(
  url: string,
  resolution: ExportResolutionLevel,
): Promise<ExportedImageBlob> {
  const { image, sourceWidth, sourceHeight } = await loadImage(url)
  const requestedScale = getExportScale(resolution)
  const actualScale = getSafeScale(sourceWidth, sourceHeight, requestedScale)
  const width = Math.max(1, Math.round(sourceWidth * actualScale))
  const height = Math.max(1, Math.round(sourceHeight * actualScale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('浏览器画布初始化失败。')
  }

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(image, 0, 0, width, height)

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) {
        resolve(result)
        return
      }
      reject(new Error('高清图片导出失败，请稍后重试。'))
    }, 'image/png')
  })

  return {
    blob,
    width,
    height,
    requestedScale,
    actualScale,
    limited: actualScale < requestedScale,
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const blobUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = blobUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(blobUrl)
}

export function downloadOriginalImage(url: string, filename: string) {
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.target = '_blank'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
