chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (sender.id !== chrome.runtime.id || message.type !== 'download-png') return
  ;(async () => {
    const url = new URL(message.url)
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('仅支持 HTTP 图片')
    const response = await fetch(url, { credentials: 'omit' })
    if (!response.ok) throw new Error(`图片请求失败 (${response.status})`)
    const blob = await response.blob()
    if (blob.size > 25 * 1024 * 1024) throw new Error('单张图片超过 25 MB')
    const bitmap = await createImageBitmap(blob)
    if (bitmap.width * bitmap.height > 40000000) { bitmap.close(); throw new Error('图片尺寸过大') }
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
    canvas.getContext('2d').drawImage(bitmap, 0, 0)
    bitmap.close()
    const png = await canvas.convertToBlob({ type: 'image/png' })
    const bytes = new Uint8Array(await png.arrayBuffer())
    let binary = ''
    for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192))
    const number = Math.max(1, Math.min(99999, Number(message.number) || 1))
    const id = await chrome.downloads.download({ url: 'data:image/png;base64,' + btoa(binary), filename: `ImageGrab/product_${String(number).padStart(3, '0')}.png`, saveAs: false })
    reply({ ok: true, id })
  })().catch(error => reply({ ok: false, error: error.message }))
  return true
})
