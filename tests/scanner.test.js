import test from 'node:test'
import assert from 'node:assert/strict'
import { scanImages } from '../extension/scanner.js'
test('scanner normalizes, deduplicates, ignores small and unsafe images', () => {
  globalThis.document = { baseURI: 'https://example.com/product/', title: 'Product', images: [
    { src:'https://example.com/a.jpg',naturalWidth:800,naturalHeight:600,getAttribute:()=>null },
    { src:'https://example.com/a.jpg',naturalWidth:800,naturalHeight:600,getAttribute:()=>null },
    { src:'https://example.com/icon.jpg',naturalWidth:32,naturalHeight:32,getAttribute:()=>null },
    { src:'data:image/png;base64,test',getAttribute:key=>key==='data-src'?'../large.jpg':null }
  ], querySelectorAll:()=>[{ bg:'url("/background.webp")' }] }
  globalThis.location = { href:'https://example.com/product/' }
  globalThis.getComputedStyle = item => ({ backgroundImage:item.bg })
  assert.deepEqual(scanImages().images.map(item=>item.url), ['https://example.com/a.jpg','https://example.com/large.jpg','https://example.com/background.webp'])
})
