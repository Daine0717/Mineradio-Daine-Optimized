# 发布流程

## v2.1.2 发布信息

- GitHub 仓库：`Daine0717/Mineradio-Daine-Optimized`
- Release 标签：`v2.1.2`
- Release 标题：`Mineradio优化版 v2.1.2`
- 本地提交目录：`E:\Github项目提交\Mineradio-v2.1.2`
- 源码归档：`Mineradio-Daine-Optimized-v2.1.2-source.zip`

## 发布前检查

1. 确认 `package.json`、`package-lock.json`、README、更新日志均为 `2.1.2`。
2. 运行：

```powershell
npm run check:minimal
node scripts/check-home-recommendation.js
node scripts/check-playlist-panel-top-button.js
node --check server.js
git diff --check
```

3. 执行 `npm run build:win`，从当前源码生成新的 Windows 安装包。
4. 确认 `latest.yml` 的 `url` 与 `path` 和实际安装包文件名完全一致；计算安装包 SHA256，并将源码压缩包、安装包、blockmap、`latest.yml` 和校验文件复制到本地提交目录。
5. 上传前由维护者审查 `CHANGELOG.md` 的 2.1.2 内容；未经确认不得提交、推送、打标签或创建 GitHub Release。

## GitHub Release 资产

- `Mineradio优化版-2.1.2-Setup.exe`
- `Mineradio优化版-2.1.2-Setup.exe.blockmap`
- `latest.yml`
- `Mineradio优化版-2.1.2-SHA256SUMS.txt`
- `Mineradio-Daine-Optimized-v2.1.2-source.zip`

源码归档不得包含 `.git`、`node_modules`、`dist`、本地 cookie、更新缓存或其他用户数据。
