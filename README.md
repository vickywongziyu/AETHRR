# AETHRR · AETHER 五城世界

基于 Three.js 和 Vite 的交互式 3D 网站：主题传送门首页、五城微缩总览，以及同一场景中的城镇观览与探索。

五城包括浮空群岛、牛角山城、紫境森林、精灵水庭和北境河谷。保留地图定位、场景传送、建筑及室内观览、第一人称探索、采集、市集、任务、住房和船只等现有功能。统一世界的人物显示目前暂停，访客可以直接浏览和探索。

## 本地运行

使用 Node.js 22 和 npm：

```bash
npm ci
npm run dev -- --port 5177
```

打开 `http://127.0.0.1:5177/home.html`。以终端实际显示的端口为准。

## 生产构建

```bash
npm run build:worlds
npm run preview -- --port 5177
```

生产文件位于 `dist-worlds/`。静态托管时上传整个目录，保留模型、贴图、Draco 解码器和 HTML 文件的相对路径。主题首页是 `home.html`；`index.html` 保留为独立森林页面。若托管服务默认读取 `index.html`，应将根路径 `/` 单独映射至 `/home.html`，不要把所有路径重写为同一个 HTML 页面。

| 页面 | 内容 |
| --- | --- |
| `home.html` | 主题首页 → 五城总览 → 城镇入口 |
| `aether.html` | 五城统一世界 |
| `aether.html?region=forest&arrival=portal&from=home` | 直接进入紫境森林 |
| `index.html` | 保留的独立森林场景 |
| `lake.html` | 保留的独立水庭场景 |
| `valley.html` | 保留的独立河谷场景 |

## Vercel 部署

仓库根目录的 `vercel.json` 已指定构建命令 `npm run build:worlds` 和输出目录 `dist-worlds`。根路径 `/` 使用临时重定向进入五城主题首页 `/home.html`，避免默认 `index.html` 将访客带入旧版独立森林。原有 HTML 入口保持可访问。

导入此仓库时，Root Directory 使用仓库根目录。若在控制台手动填写构建设置，Output Directory 应为 `dist-worlds`，不是 Vite 默认的 `dist`。重新部署时使用包含该配置文件的最新提交；无需提交本地产物目录。

## 目录

- `src/home/`：主题首页与五城微缩模型界面。
- `src/aether/`、`src/atlas/`：统一世界、城镇交互、导航、碰撞及地图。
- `src/forest/`、`src/watercourt/`、`src/valley/`：原有独立场景。
- `src/character/`：保留的人物与动画运行时代码。
- `public/`：网站模型、贴图、地图和本地解码器，包含网页资源而非占位文件。
- `scripts/`：构建、模型制作及检查脚本。部分 Blender 制作或历史检查脚本需要本地工作数据；运行网站和生产构建不依赖这些原生制作文件。
- `docs/texture-credits.md`：现有纹理来源说明。

## 当前边界

城镇进度存储在访客浏览器中，不是多人联网账户系统。首次载入大型场景仍需等待；实际帧率依赖设备和画质设置。室内功能使用预设的受约束视角，不代表每个房间都实现自由步行。

网站包含可编辑的示例个人介绍内容。模型、视频、截图和历史诊断的本地交付目录，以及虚拟环境、缓存、凭据和设备配置，不纳入此仓库。

本项目为原创风格化 3D 场景，不宣称与参考原画逐像素一致。第三方素材按各自许可使用，现有来源记录见纹理说明。
