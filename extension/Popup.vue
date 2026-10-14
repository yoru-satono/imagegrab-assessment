<script setup>
import { ref } from 'vue'
import { Images, ScanLine } from '@lucide/vue'
import { scanImages } from './scanner.js'
const busy = ref(false), error = ref('')
async function extract() {
  busy.value = true; error.value = ''
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!/^https?:/.test(tab.url || '')) throw new Error('请先打开普通网页，再获取图片。')
    const [result] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: scanImages })
    const session = crypto.randomUUID()
    await chrome.storage.local.set({ [session]: { ...result.result, createdAt: Date.now() } })
    const stored = await chrome.storage.local.get(null)
    const old = Object.entries(stored).filter(([, value]) => value?.createdAt && Date.now() - value.createdAt > 86400000).map(([key]) => key)
    if (old.length) await chrome.storage.local.remove(old)
    await chrome.tabs.create({ url: chrome.runtime.getURL(`gallery.html?session=${session}`) })
    window.close()
  } catch (e) { error.value = e.message } finally { busy.value = false }
}
</script>
<template><main><header><Images :size="26"/><strong>图拾<span>ImageGrab</span></strong></header><p>把当前页面的图片，收进一个画廊。</p><button @click="extract" :disabled="busy"><ScanLine :size="18"/>{{busy?'正在获取…':'获取页面图片'}}</button><p class="note">只在点击后读取当前页，图片列表仅保存于本机。</p><p role="alert" v-if="error">{{error}}</p></main></template>
