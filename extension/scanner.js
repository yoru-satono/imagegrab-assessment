// This function is serialized by chrome.scripting; keep it self-contained.
export function scanImages() {
  const found = new Map()
  const add = (value, width = 0, height = 0) => {
    if (!value) return
    try {
      const url = new URL(value, document.baseURI)
      if (!['http:', 'https:'].includes(url.protocol)) return
      if (width && height && (width < 100 || height < 100)) return
      if (/sprite|favicon|placeholder|loading|logo/i.test(url.pathname)) return
      if (!found.has(url.href)) found.set(url.href, { url: url.href, width, height })
    } catch { /* Ignore malformed page attributes. */ }
  }
  for (const img of document.images) {
    const lazy = img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || img.getAttribute('data-original')
    if (lazy) add(lazy)
    add(img.currentSrc || img.src, img.naturalWidth, img.naturalHeight)
    for (const item of (img.getAttribute('srcset') || '').split(',')) add(item.trim().split(/\s+/)[0])
  }
  for (const element of document.querySelectorAll('body *')) {
    const background = getComputedStyle(element).backgroundImage
    for (const match of background.matchAll(/url\(["']?(.+?)["']?\)/g)) add(match[1])
  }
  return { title: document.title, source: location.href, images: [...found.values()].slice(0, 1000) }
}
