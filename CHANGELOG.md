# Changelog

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [SemVer](https://semver.org/lang/zh-CN/)。

## [0.1.0] - 2026-10-18

### Added

- 两段式审批 Enter：第一下把焦点移入待审批面板，第二下由 DSH 官方处理器应答「允许一次」。
- 聚焦反馈：面板卡在持有键盘焦点时显示品牌色描边（仅用 `--dsw-alias-*` 主题令牌）。
- 守卫：输入框 / 已聚焦控件 / 组合键 / 长按连发 / 输入法组字 / 不可见或已应答面板一律放过。
- 纯客户端实现：一个 `document` keydown 监听 + 一条样式，随 `ctx.effect` 一并释放。

### Known limitations

- 依赖 DSH 面板锚点（`[data-approval-key]`、`aria-busy`、`[role="group"][tabindex]`）；
  上游改结构时静默退化为「需要先点面板」，不会误批。
- 与「一步 Enter 直接批准」类插件互斥，见 README 第 5 节。
