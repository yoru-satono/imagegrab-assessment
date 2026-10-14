import { chromium, expect } from '@playwright/test'
import { createServer } from 'node:http'
import { readFile, mkdir } from 'node:fs/promises'
import { resolve, extname, relative, isAbsolute } from 'node:path'
import assert from 'node:assert/strict'
import { unzipSync } from 'fflate'

const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.zip': 'application/zip' }
const root = resolve('docs')
const server = createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
  const path = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`)
  const local = relative(root, path)
  if (local.startsWith('..') || isAbsolute(local)) { response.writeHead(403); response.end(); return }
  try { response.setHeader('Content-Type', types[extname(path)] || 'application/octet-stream'); response.end(await readFile(path)) }
  catch { response.writeHead(404); response.end() }
})
await new Promise(r => server.listen(0, '127.0.0.1', r))
let browser
try {
  assert.equal((await readFile('docs/.nojekyll')).length, 0)
  browser = await chromium.launch({ channel: 'chromium', headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`http://127.0.0.1:${server.address().port}/`)
  await expect(page.getByRole('heading', { name: '每一张，都看得清。' })).toBeVisible()
  for (const name of ['gallery.png', 'preview.png']) {
    const image = page.locator(`.product-screen[src$="${name}"]`)
    await image.scrollIntoViewIfNeeded()
    await image.evaluate(image => image.decode())
    assert.ok(await image.evaluate(image => image.naturalWidth > 0))
    assert.ok((await readFile(`docs/media/${name}`)).equals(await readFile(`site/public/media/${name}`)), `Rebuild the website after regenerating ${name}`)
  }
  const downloadEvent = page.waitForEvent('download')
  await page.getByRole('link', { name: '下载插件', exact: true }).click()
  const download = await downloadEvent
  assert.equal(await download.failure(), null)
  const archive = await readFile(await download.path())
  assert.deepEqual(archive, await readFile('site/public/imagegrab-extension.zip'))
  const unpacked = unzipSync(archive)
  for (const [name, data] of Object.entries(unpacked)) assert.deepEqual(Buffer.from(data), await readFile(resolve('extension-dist', name)))
  await mkdir('test-results', { recursive: true })
  await page.screenshot({ path: 'test-results/site-desktop.png', fullPage: true })
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 })
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    await page.getByRole('button', { name: '切换导航' }).click()
    await page.locator('.nav-links').getByRole('link', { name: '图片画廊' }).click()
    await expect(page.getByRole('button', { name: '切换导航' })).toHaveAttribute('aria-expanded', 'false')
  }
  await page.screenshot({ path: 'test-results/site-mobile.png', fullPage: true })
  assert.deepEqual(errors, [])
  console.log('PASS: built website, both actual screenshots, downloadable ZIP matches extension build, desktop/390px/320px layouts, mobile navigation, no page errors')
} finally { await browser?.close(); await new Promise(r => server.close(r)) }
