<script setup>
import { ref, computed, onMounted } from 'vue'
import { Images, Download, Check, ArrowUpRight, RotateCcw, Search, ShieldCheck, ImageOff } from '@lucide/vue'
const entries = ref([]), selected = ref(new Set()), minimum = ref(100), search = ref(''), loading = ref(true), busy = ref(false), done = ref(0), status = ref(''), failures = ref([]), source = ref(''), title = ref('')
const visible = computed(() => entries.value.filter(item => !item.failed && item.width >= minimum.value && item.height >= minimum.value && item.url.toLowerCase().includes(search.value.toLowerCase())))
const chosen = computed(() => visible.value.filter(item => selected.value.has(item.url)))
function toggle(url) { const next = new Set(selected.value); next.has(url) ? next.delete(url) : next.add(url); selected.value = next }
function all() { selected.value = new Set(visible.value.map(item => item.url)) }
function invert() { selected.value = new Set(visible.value.filter(item => !selected.value.has(item.url)).map(item => item.url)) }
onMounted(async () => {
  try {
    if (!globalThis.chrome?.storage) throw new Error('请从已安装的图拾插件打开画廊。')
    const session = new URLSearchParams(location.search).get('session')
    const value = (await chrome.storage.local.get(session))[session]
    if (!value) throw new Error('图片会话已过期，请返回原网页重新获取。')
    title.value = value.title; source.value = value.source
    const unique = [...new Map(value.images.map(item => [item.url, item])).values()]
    entries.value = await Promise.all(unique.map(item => new Promise(resolve => {
      const image = new Image(), timeout = setTimeout(() => resolve({ ...item, failed: true }), 12000)
      image.onload = () => { clearTimeout(timeout); resolve({ ...item, width: image.naturalWidth, height: image.naturalHeight }) }
      image.onerror = () => { clearTimeout(timeout); resolve({ ...item, failed: true }) }
      image.src = item.url
    })))
    all()
  } catch(e) { status.value = e.message } finally { loading.value = false }
})
async function download() {
  const items = [...chosen.value]
  if (!items.length || busy.value) return
  // Request only selected image origins, in response to this user gesture.
  const origins = [...new Set(items.map(item => `${new URL(item.url).origin}/*`))]
  busy.value = true; done.value = 0; failures.value = []; status.value = ''
  try {
    const granted = await chrome.permissions.request({ origins })
    if (!granted) throw new Error('未授予图片域名权限，下载已取消。')
    for (let index = 0; index < items.length; index++) {
      const result = await chrome.runtime.sendMessage({ type: 'download-png', url: items[index].url, number: index + 1 })
      if (!result?.ok) failures.value.push(`${index + 1}: ${result?.error || '下载失败'}`)
      done.value = index + 1
    }
    status.value = `已交给浏览器下载 ${items.length - failures.value.length} 张 PNG${failures.value.length ? `，失败 ${failures.value.length} 张` : ''}。保存结果请查看浏览器下载列表。`
  } catch(e) { status.value = e.message } finally { busy.value = false }
}
</script>
<template>
  <header class="top"><a class="brand" href="#"><Images :size="27"/><strong>图拾<span>ImageGrab</span></strong></a><span class="private"><ShieldCheck :size="15"/>图片仅在本机处理</span></header>
  <main>
    <div class="heading"><div><p class="eyebrow">YOUR IMAGE COLLECTION</p><h1>好图片，一起收好。</h1><p class="sub">{{title || '页面图片画廊'}}</p><a class="source" v-if="source" :href="source" target="_blank" rel="noopener">查看来源网页 <ArrowUpRight :size="14"/></a></div><div class="count"><strong>{{visible.length}}</strong><span>张图片</span></div></div>
    <div class="toolbar"><div class="selection"><button @click="all" :disabled="busy||loading"><Check :size="16"/>全选</button><button @click="invert" :disabled="busy||loading"><RotateCcw :size="16"/>反选</button><span>已选 <b>{{chosen.length}}</b> 张</span></div><div class="filters"><label class="search"><Search :size="16"/><input aria-label="搜索图片地址" v-model="search" placeholder="搜索图片地址" :disabled="busy"/></label><select v-model.number="minimum" aria-label="最小图片尺寸" :disabled="busy"><option :value="100">最小 100 × 100</option><option :value="300">最小 300 × 300</option><option :value="600">最小 600 × 600</option></select><button class="primary" @click="download" :disabled="busy||!chosen.length"><Download :size="17"/>{{busy?`处理中 ${done}/${chosen.length}`:`下载选中 (${chosen.length})`}}</button></div></div>
    <p class="feedback" role="status" v-if="status">{{status}}</p><ul class="errors" v-if="failures.length"><li v-for="failure in failures" :key="failure">{{failure}}</li></ul>
    <div class="empty" v-if="loading">正在加载图片…</div><div class="empty" v-else-if="!visible.length"><ImageOff :size="34"/><h2>没有符合条件的图片</h2><p>调整尺寸或搜索条件，也可返回原网页加载更多图片。</p></div>
    <div class="grid" v-else><article v-for="(item,index) in visible" :key="item.url" :class="{selected:selected.has(item.url)}"><label><div class="image-wrap"><img :src="item.url" :alt="`页面图片 ${index+1}`"/><input type="checkbox" :checked="selected.has(item.url)" @change="toggle(item.url)" :disabled="busy" :aria-label="`选择图片 ${index+1}`"/><span class="number">{{String(index+1).padStart(2,'0')}}</span></div><div class="meta"><strong>图片 {{String(index+1).padStart(2,'0')}}</strong><span>{{item.width}} × {{item.height}}</span></div></label></article></div>
    <footer><span>已过滤 {{entries.length-visible.length}} 张小图、加载失败或不匹配的图片</span><span>PNG 格式 · 自动编号 · 按需授权</span></footer>
  </main>
</template>
