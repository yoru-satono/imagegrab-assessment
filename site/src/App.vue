<script setup>
import { ref } from 'vue'
import { Images, ArrowDownToLine, ArrowUpRight, ScanLine, SlidersHorizontal, Grid2X2, FileImage, ShieldCheck, Menu, X, Check } from '@lucide/vue'
const menu = ref(false)
const repo = 'https://github.com/yoru-satono/imagegrab-assessment'
const galleryImage = `${import.meta.env.BASE_URL}media/gallery.png`
const features = [
  { icon: ScanLine, n: '01', title: '从页面，来到画廊', description: '扫描普通图片、懒加载属性与背景图，自动去重。先加载页面，才能收集尚未出现的图片。' },
  { icon: SlidersHorizontal, n: '02', title: '留下你想要的', description: '按尺寸过滤小图，用地址关键词查找，全选、反选或逐张挑选。' },
  { icon: FileImage, n: '03', title: '统一保存为 PNG', description: '把选中图片转换为 PNG 并自动编号。逐张显示处理进度，失败原因不会被藏起来。' }
]
</script>
<template>
  <header><nav><a class="brand" href="#"><Images :size="26"/><strong>图拾<span>ImageGrab</span></strong></a><button class="menu" @click="menu=!menu" aria-label="切换导航" :aria-expanded="menu"><X v-if="menu"/><Menu v-else/></button><div class="nav-links" :class="{open:menu}"><a href="#features" @click="menu=false">产品功能</a><a href="#preview" @click="menu=false">图片画廊</a><a href="#install" @click="menu=false">安装步骤</a><a :href="repo" target="_blank" rel="noopener">GitHub <ArrowUpRight :size="14"/></a></div></nav></header>
  <main>
    <section class="hero"><img class="hero-bg" :src="galleryImage" alt="图拾插件真实图片画廊"/><div class="hero-copy"><span class="release"><span></span> CHROME EXTENSION / V1.0</span><h1>图拾 <small>ImageGrab</small></h1><p>页面里的好图片，<br/>一次收好。</p><div class="hero-actions"><a class="primary" href="./imagegrab-extension.zip" download><ArrowDownToLine :size="18"/>下载插件</a><a class="text-link" href="#preview">看看图片画廊 <ArrowUpRight :size="16"/></a></div><span class="hero-note">按需提取 · 本机处理 · PNG 保存</span></div></section>
    <section id="features" class="band"><div class="section-heading"><div><p class="eyebrow">LESS CLICKING, MORE COLLECTING</p><h2>从分散的图片，到整齐的收藏。</h2></div><p>轻量、直接，专注于收集这件小事。</p></div><div class="features"><article v-for="item in features" :key="item.n"><div class="feature-icon"><component :is="item.icon" :size="25"/><span>{{item.n}}</span></div><h3>{{item.title}}</h3><p>{{item.description}}</p></article></div></section>
    <section id="preview" class="preview-band"><div class="section-heading"><div><p class="eyebrow">A CLEARER VIEW</p><h2>每一张，都看得清。</h2></div><span class="caption"><Grid2X2 :size="16"/>实际插件界面</span></div><img class="product-screen" :src="galleryImage" alt="图拾画廊：图片选择、尺寸筛选与 PNG 下载"/><div class="preview-foot"><span><Check :size="16"/>清晰预览与尺寸信息</span><span><Check :size="16"/>逐张选择与批量下载</span><span><Check :size="16"/>无账户、无上传服务器</span></div></section>
    <section id="install" class="band install"><div class="section-heading"><div><p class="eyebrow">READY IN A MINUTE</p><h2>把图拾放进你的浏览器。</h2></div><a class="primary" href="./imagegrab-extension.zip" download><ArrowDownToLine :size="18"/>下载 v1.0</a></div><ol><li><span>01</span><h3>下载并解压</h3><p>把插件压缩包解压到一个固定文件夹。</p></li><li><span>02</span><h3>打开扩展管理</h3><p>在 Chrome 地址栏打开 <code>chrome://extensions</code>，开启开发者模式。</p></li><li><span>03</span><h3>加载插件</h3><p>点击“加载已解压的扩展程序”，选择解压后的文件夹。</p></li><li><span>04</span><h3>获取页面图片</h3><p>打开网页，点击图拾图标获取图片。在画廊中选择并下载。</p></li></ol><aside><ShieldCheck :size="22"/><div><strong>权限，只在需要时使用。</strong><p>只在点击插件时读取当前页面；下载前请求选中图片域名的权限。无法访问的图片会报告失败，不绕过登录或网站限制。请仅下载你有权使用的图片。</p></div></aside></section>
  </main><footer><a class="brand" href="#"><Images :size="24"/><strong>图拾</strong></a><span>ImageGrab · 2026</span><a :href="repo" target="_blank" rel="noopener">开源代码 <ArrowUpRight :size="14"/></a></footer>
</template>
