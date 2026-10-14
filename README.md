# 图拾 ImageGrab

Vue 3 图片画廊与官网，Chrome Manifest V3 页面图片提取插件。

## 本机运行

使用本机 Node.js，无需 Docker。

```sh
npm install
npm test
npm run build
npm run dev
```

Chrome 扩展管理页开启开发者模式，加载 `extension-dist` 文件夹。打开普通网页，点击图拾图标，再点击“获取页面图片”。画廊提供预览、按尺寸筛选、地址搜索、全选、反选、勾选和 PNG 批量下载。官网静态构建在 `docs`。

## 权限与限制

- 仅点击时通过 activeTab 读取当前页；不自动监控浏览。
- 图片列表只保存在扩展的本机存储，超过一天的旧列表在下次提取时清理。
- 下载时按需申请选中图片的来源域名权限；拒绝后取消，不绕过访问限制。
- 扫描当前 DOM 图片、懒加载属性、srcset 与背景图片；尚未加载的内容、跨域 iframe 不在扫描范围内。
- 自动过滤小于 100×100 的图片、部分常见占位和图标名称；可选择更大尺寸。
- 每次最多 1000 张；单张最多 25 MB / 4000 万像素。无法加载、转换或下载的图片显示失败原因。
- 提交给浏览器的下载任务不等于文件保存完成，最终状态以浏览器下载列表为准。
- 请只下载你有权使用的图片。

## 发布

Git SSH remote: `git@github.com:yoru-satono/imagegrab-assessment.git`

GitHub Pages 由 `main` 分支的 `/docs` 发布。

测试用商品图片来自 Unsplash。测试页面仅用于验证真实扫描、去重、尺寸过滤与 PNG 下载，不代表在电商登录页上完成验证。
