import { chromium } from '@playwright/test'
import { createServer } from 'node:http'
import { readFile, cp, mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'
import { scanImages } from '../extension/scanner.js'

const output = resolve('../assessment2-screenshots')
const temp = resolve('../.reading/imagegrab-test-extension')
await mkdir(output, { recursive:true })
await cp(resolve('extension-dist'), temp, { recursive:true })
const manifest = JSON.parse(await readFile(resolve(temp,'manifest.json'), 'utf8'))
// A disposable test-only build gets access to the local fixture; shipped permissions stay unchanged.
manifest.host_permissions = ['http://127.0.0.1/*']
await writeFile(resolve(temp,'manifest.json'), JSON.stringify(manifest))
const fixture = `<!doctype html><html><head><title>精选生活好物 · 图片采集测试页</title></head><body>${Array.from({length:8},(_,i)=>`<img src="/media/product-${i+1}.jpg" alt="Product ${i+1}">`).join('')}<img src="/media/product-1.jpg"><img data-src="/media/product-3.jpg" src="/tiny.png"><img src="/tiny.png"><div style="background-image:url('/media/product-8.jpg');height:300px"></div></body></html>`
const server = createServer(async (request,response) => {
  try {
    if(request.url==='/') {response.setHeader('Content-Type','text/html;charset=utf-8');response.end(fixture);return}
    if(request.url==='/tiny.png') {response.setHeader('Content-Type','image/png');response.end(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64'));return}
    const match = request.url.match(/^\/media\/(product-[1-8]\.jpg)$/)
    if(!match) {response.writeHead(404);response.end();return}
    response.setHeader('Content-Type','image/jpeg');response.end(await readFile(resolve('site/public/media', match[1])))
  } catch {response.writeHead(500);response.end()}
})
await new Promise(r=>server.listen(5180,'127.0.0.1',r))
let context
try {
  context = await chromium.launchPersistentContext(resolve('../.reading/imagegrab-test-profile'), {channel:'chromium',headless:true,viewport:{width:1440,height:1100},args:[`--disable-extensions-except=${temp}`,`--load-extension=${temp}`]})
  let [worker]=context.serviceWorkers()
  if(!worker) worker=await context.waitForEvent('serviceworker')
  const id=new URL(worker.url()).hostname
  const page=await context.newPage()
  await page.goto('http://127.0.0.1:5180/')
  await page.locator('img').first().waitFor()
  await page.waitForFunction(()=>[...document.images].every(image=>image.complete))
  const scan = await page.evaluate(scanImages)
  assert.equal(scan.images.length,8)
  await worker.evaluate(async scan => {await chrome.storage.local.set({evidence:scan})}, scan)
  const gallery=await context.newPage()
  const errors=[];gallery.on('pageerror',e=>errors.push(e.message))
  await gallery.goto(`chrome-extension://${id}/gallery.html?session=evidence`)
  await gallery.getByRole('button',{name:'下载选中 (8)'}).waitFor()
  assert.equal(await gallery.locator('.grid article').count(),8)
  await gallery.getByRole('button',{name:'反选',exact:true}).click()
  assert.ok(await gallery.getByRole('button',{name:'下载选中 (0)'}).isDisabled())
  await gallery.getByRole('checkbox',{name:'选择图片 1',exact:true}).check()
  await gallery.getByRole('button',{name:'下载选中 (1)'}).click()
  await gallery.getByRole('status').filter({hasText:'已交给浏览器下载 1 张 PNG'}).waitFor()
  const saved=await worker.evaluate(async()=>{for(let i=0;i<50;i++){const entries=await chrome.downloads.search({});if(entries.some(e=>e.state==='complete'))return entries.filter(e=>e.state==='complete').map(e=>({filename:e.filename,state:e.state}));await new Promise(r=>setTimeout(r,100))}return []})
  assert.ok(saved.length>0,'PNG download must actually finish')
  const png=await readFile(saved[0].filename)
  assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a')
  await gallery.screenshot({path:resolve(output,'01a-plugin-download.png'),fullPage:true})
  await gallery.getByRole('combobox',{name:'最小图片尺寸'}).selectOption('600')
  assert.equal(await gallery.locator('.grid article').count(),8)
  await gallery.getByRole('textbox',{name:'搜索图片地址'}).fill('product-2')
  assert.equal(await gallery.locator('.grid article').count(),1)
  await gallery.getByRole('textbox',{name:'搜索图片地址'}).fill('')
  await gallery.getByRole('combobox',{name:'最小图片尺寸'}).selectOption('100')
  await gallery.getByRole('button',{name:'全选',exact:true}).click()
  await gallery.reload()
  await gallery.getByRole('button',{name:'下载选中 (8)'}).waitFor()
  await gallery.screenshot({path:resolve(output,'01-plugin-gallery.png'),fullPage:true})
  await gallery.screenshot({path:resolve('site/public/media/gallery.png'),fullPage:true})
  for (const width of [390,320]) {
    await gallery.setViewportSize({width,height:844})
    assert.ok(await gallery.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
  }
  assert.deepEqual(errors,[])
  console.log(JSON.stringify({result:'PASS',images:scan.images.length,pngSignature:'89504e470d0a1a0a',downloads:saved.length,checks:['real extension runtime','scanner','dedup','small-image filter','select/invert','size filter','address search','PNG conversion','actual file download','320px/390px no overflow','no page errors']},null,2))
} finally {await context?.close();await new Promise(r=>server.close(r))}
