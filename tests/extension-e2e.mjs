import { chromium, expect } from '@playwright/test'
import { createServer } from 'node:http'
import { readFile, cp, mkdir, writeFile, mkdtemp, rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'
import { scanImages } from '../extension/scanner.js'

const output = resolve('test-results')
const sandbox = await mkdtemp('C:/Users/Chain/AppData/Local/Temp/opencode/imagegrab-')
const temp = resolve(sandbox, 'extension')
await mkdir(output, { recursive:true })
await cp(resolve('extension-dist'), temp, { recursive:true })
const manifest = JSON.parse(await readFile(resolve(temp,'manifest.json'), 'utf8'))
// A disposable test-only build gets access to the local fixture; shipped permissions stay unchanged.
manifest.host_permissions = ['http://127.0.0.1/*']
await writeFile(resolve(temp,'manifest.json'), JSON.stringify(manifest))
const fixture = `<!doctype html><html><head><title>精选生活好物 · 图片采集测试页</title></head><body>${Array.from({length:8},(_,i)=>`<img src="/media/product-${i+1}.jpg" alt="Product ${i+1}">`).join('')}<img src="/medium.svg"><img src="/media/product-1.jpg"><img data-src="/media/product-3.jpg" src="/tiny.png"><img src="/tiny.png"><div style="background-image:url('/media/product-8.jpg');height:300px"></div></body></html>`
const server = createServer(async (request,response) => {
  try {
     if(request.url==='/') {response.setHeader('Content-Type','text/html;charset=utf-8');response.end(fixture);return}
     if(request.url==='/medium.svg') {response.setHeader('Content-Type','image/svg+xml');response.end('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#236d5e"/></svg>');return}
    if(request.url==='/tiny.png') {response.setHeader('Content-Type','image/png');response.end(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64'));return}
    const match = request.url.match(/^\/media\/(product-[1-8]\.jpg)$/)
    if(!match) {response.writeHead(404);response.end();return}
    response.setHeader('Content-Type','image/jpeg');response.end(await readFile(resolve('site/public/media', match[1])))
  } catch {response.writeHead(500);response.end()}
})
await new Promise(r=>server.listen(5180,'127.0.0.1',r))
let context
try {
  context = await chromium.launchPersistentContext(resolve(sandbox,'profile'), {channel:'chromium',headless:true,viewport:{width:1440,height:1100},args:[`--disable-extensions-except=${temp}`,`--load-extension=${temp}`]})
  let [worker]=context.serviceWorkers()
  if(!worker) worker=await context.waitForEvent('serviceworker')
  const id=new URL(worker.url()).hostname
  const page=await context.newPage()
  await page.goto('http://127.0.0.1:5180/')
  await page.locator('img').first().waitFor()
  await page.waitForFunction(()=>[...document.images].every(image=>image.complete))
  const scan = await page.evaluate(scanImages)
  assert.equal(scan.images.length,9)
  await worker.evaluate(async scan => {await chrome.storage.local.set({evidence:scan})}, scan)
  const gallery=await context.newPage()
  const errors=[];gallery.on('pageerror',e=>errors.push(e.message))
  await gallery.goto(`chrome-extension://${id}/gallery.html?session=evidence`)
  await gallery.getByRole('button',{name:'下载选中 (9)'}).waitFor()
  assert.equal(await gallery.locator('.grid article').count(),9)
  const modal = gallery.getByRole('dialog')
  const firstPreview = gallery.getByRole('button',{name:'预览图片 1',exact:true})
  await firstPreview.click()
  await expect(modal).toBeVisible()
  await expect(modal.locator('#preview-details')).toContainText('1 / 9')
  const firstDimensions = await gallery.locator('.grid article .meta span').first().textContent()
  await expect(modal.locator('#preview-details')).toContainText(firstDimensions)
  await expect(gallery.getByRole('button',{name:'关闭预览',exact:true})).toBeFocused()
  await gallery.keyboard.press('Shift+Tab')
  assert.ok(await modal.evaluate(el=>el.contains(document.activeElement)), 'focus must stay in dialog')
  await gallery.keyboard.press('ArrowLeft')
  await expect(modal.locator('#preview-details')).toContainText('9 / 9')
  await gallery.getByRole('button',{name:'下一张',exact:true}).click()
  await expect(modal.locator('#preview-details')).toContainText('1 / 9')
  await gallery.keyboard.press('ArrowRight')
  await expect(modal.locator('#preview-details')).toContainText('2 / 9')
  await gallery.getByRole('button',{name:'上一张',exact:true}).click()
  await gallery.keyboard.press('Escape')
  await expect(modal).not.toBeVisible()
  await expect(firstPreview).toBeFocused()
  assert.equal(await gallery.locator('.grid input:checked').count(),9,'preview must preserve selection')
  await gallery.getByRole('button',{name:'反选',exact:true}).click()
  assert.ok(await gallery.getByRole('button',{name:'下载选中 (0)'}).isDisabled())
  await gallery.getByRole('checkbox',{name:'选择图片 1',exact:true}).check()
  await gallery.getByRole('checkbox',{name:'选择图片 2',exact:true}).check()
  await gallery.getByRole('button',{name:'下载选中 (2)'}).click()
  await gallery.getByRole('status').filter({hasText:'已交给浏览器下载 2 张 PNG'}).waitFor()
  const saved=await worker.evaluate(async()=>{for(let i=0;i<50;i++){const entries=await chrome.downloads.search({});if(entries.filter(e=>e.state==='complete').length===2)return entries.filter(e=>e.state==='complete').map(e=>({filename:e.filename,state:e.state}));await new Promise(r=>setTimeout(r,100))}return []})
  assert.equal(saved.length,2,'Both PNG downloads must actually finish')
  for (const entry of saved) {
    const png=await readFile(entry.filename)
    assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a')
    assert.equal(png.readUInt32BE(16),700)
    assert.equal(png.readUInt32BE(20),600)
  }
  await gallery.screenshot({path:resolve(output,'01a-plugin-download.png'),fullPage:true})
  await gallery.getByRole('combobox',{name:'最小图片尺寸'}).selectOption('600')
  assert.equal(await gallery.locator('.grid article').count(),8)
  await gallery.getByRole('textbox',{name:'搜索图片地址'}).fill('product-2')
  await expect(gallery.locator('.grid article')).toHaveCount(1)
  await firstPreview.click()
  await expect(gallery.getByRole('button',{name:'上一张',exact:true})).toBeDisabled()
  await expect(gallery.getByRole('button',{name:'下一张',exact:true})).toBeDisabled()
  await expect(modal.locator('img')).toHaveAttribute('src', /product-2/)
  await gallery.getByRole('button',{name:'关闭预览',exact:true}).click()
  await gallery.getByRole('textbox',{name:'搜索图片地址'}).fill('no-match')
  await expect(gallery.getByText('没有符合条件的图片')).toBeVisible()
  await gallery.getByRole('textbox',{name:'搜索图片地址'}).fill('')
  await gallery.getByRole('combobox',{name:'最小图片尺寸'}).selectOption('100')
  await gallery.getByRole('button',{name:'全选',exact:true}).click()
  await gallery.reload()
  await gallery.getByRole('button',{name:'下载选中 (9)'}).waitFor()
  await gallery.getByRole('combobox',{name:'最小图片尺寸'}).selectOption('600')
  await expect(gallery.locator('.grid article')).toHaveCount(8)
  await gallery.screenshot({path:resolve(output,'01-plugin-gallery.png'),fullPage:true})
  await gallery.screenshot({path:resolve('site/public/media/gallery.png'),fullPage:true})
  await firstPreview.click()
  await expect(modal.locator('img')).toBeVisible()
  await modal.locator('img').evaluate(image=>image.decode())
  await gallery.screenshot({path:resolve('site/public/media/preview.png')})
  await gallery.keyboard.press('Escape')
  for (const width of [390,320]) {
    await gallery.setViewportSize({width,height:844})
     assert.ok(await gallery.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
     await firstPreview.click()
     await expect(modal).toBeVisible()
     const bounds = await modal.boundingBox()
     assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width)
     assert.ok(bounds.y >= 0 && bounds.y + bounds.height <= 844)
     await gallery.getByRole('button',{name:'下一张',exact:true}).click()
     await expect(modal.locator('#preview-details')).toContainText('2 / 8')
     await gallery.getByRole('button',{name:'关闭预览',exact:true}).click()
  }
  await firstPreview.click()
  await gallery.mouse.click(1, 1)
  await expect(modal).not.toBeVisible()
  await expect(firstPreview).toBeFocused()
  assert.deepEqual(errors,[])
  console.log(JSON.stringify({result:'PASS',images:scan.images.length,pngSignature:'89504e470d0a1a0a',downloads:saved.length,checks:['real extension runtime','scanner','dedup','small-image filter','select/invert','size filter','address search and empty state','preview dimensions','previous/next and wraparound','arrow keys and Escape','focus trap and restore','selection preserved','single filtered preview','PNG conversion','actual file download','320px/390px gallery and modal','no page errors']},null,2))
} finally {await context?.close();await new Promise(r=>server.close(r));await rm(sandbox,{recursive:true,force:true})}
