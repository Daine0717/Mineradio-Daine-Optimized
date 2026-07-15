# Mineradio 优化版

基于原创项目 [XxHuberrr/Mineradio](https://github.com/XxHuberrr/Mineradio) 与二创项目 [zzstar101/Mineradio-Tauri](https://github.com/zzstar101/Mineradio-Tauri) 继续优化的 Windows Electron 沉浸式音乐播放器。当前版本由 Daine 维护，保留歌词舞台、粒子视觉、3D 歌单架和多平台音乐体验，并加入极简歌词窗口、酷狗音乐同步与界面优化。

## 当前版本

当前版本：`2.1.2`

状态：Daine 优化版 2.1.2。

## 主要功能

- 网易云音乐、QQ 音乐、酷狗音乐三平台登录与账号状态展示
- 酷狗账号信息、VIP 状态、云端歌单、歌词和播放接口接入
- 搜索、歌单、歌词舞台、桌面歌词、3D 歌单架与粒子视觉预设
- Home 页面快捷入口、平台筛选和“我喜欢”专属歌单视图
- 极简模式：`900 × 150` 液态玻璃歌词条、基础播放控制与专用低密度星河视觉
- 极简窗口屏幕边缘约束、平滑进出动画和窗口缩放性能优化
- GitHub Releases 更新检测

## 极简模式

在播放页账号信息下方点击圆形“简”按钮，可将播放器切换为极简歌词条。极简模式会保存进入前的视觉设置，退出后自动恢复；右上角“简”按钮用于返回完整窗口。

## 安装

Windows 用户请在 [Releases](https://github.com/Daine0717/Mineradio-Daine-Optimized/releases) 下载：

`Mineradio优化版-2.1.2-Setup.exe`

不要把 `Source code`、`.blockmap` 或 `latest.yml` 当作安装包。

## 开发运行

```powershell
npm install
npm start
```

最小验证：

```powershell
npm run check:minimal
node --check server.js
git diff --check
```

构建 Windows 安装包：

```powershell
npm run build:win
```

## 修改版与版权说明

本仓库是 Daine 基于原创项目与二创项目继续开发的个人学习优化版本，不代表前述作者的官方版本。项目继续遵循 GPL-3.0 协议，并保留 `LICENSE`、`NOTICE.md` 和来源作者信息。

本项目不是网易云音乐、QQ 音乐或酷狗音乐的官方客户端，与相关平台不存在从属、合作或授权关系。第三方平台功能仅用于用户自有账号的登录、歌单同步和播放体验，不提供破解会员、绕过版权限制或非法下载音乐等功能。

详细改动见 [CHANGELOG.md](./CHANGELOG.md) 和 [MODIFICATIONS.md](./MODIFICATIONS.md)。

## 致谢

感谢原创作者 XxHuberrr、二创作者 zzstar101 及相关贡献者。

- 原创项目：[XxHuberrr/Mineradio](https://github.com/XxHuberrr/Mineradio)
- 二创项目：[zzstar101/Mineradio-Tauri](https://github.com/zzstar101/Mineradio-Tauri)
- 当前优化与维护：Daine
