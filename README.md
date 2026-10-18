# dsh-easy-approval

为 DeepSeek Harness Web UI 的审批面板加上**两段式 Enter**：

> 有审批在等你回答时，**第一下 Enter 只是「选中」审批面板**（面板出现品牌色描边），
> **第二下 Enter 才通过**。不必先用鼠标点一下面板。

[English](README.en.md) · MIT · 纯浏览器端，无 host 逻辑、无网络、无文件访问 ·
仓库 <https://github.com/UPxianyu/dsh-easy-approval>

---

## 1. 它解决什么问题

DSH 自带审批快捷键，但它绑定在面板元素上、并且要求**焦点已经在面板里**。官方客户端包
`@deepseek-ai/dsh-client-ui-approval` 的 `lib/client.js`（0.2.1-rc.2）里是这样判定的：

```js
const keydown = (event) => {
  const element = event.target;
  if (event.defaultPrevented
      || !event.currentTarget.contains(document.activeElement)   // ← 焦点必须在面板内
      || element.closest('input, textarea, select, [contenteditable="true"], [contenteditable=""]') !== null) return;
  if (event.key !== "Enter" && event.key !== "Escape") return;
  if (event.key === "Enter" && element.closest('button, a[href], [role="button"]') !== null) return;
  if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
  event.preventDefault();
  ...
  answer(event.key === "Enter" ? "allowed-once" : "rejected");
};
```

于是焦点停在对话区、页面空白处或侧栏时，Enter 根本到不了这段代码——必须先点面板。
审批是打断性的：面板出现时你的注意力往往还在别处，先移鼠标再按键，比两下 Enter 慢，也更容易误点。

本插件补的正是缺的那一半，而且**不替你做决定**：第一下只把焦点移进面板，
第二下才由官方处理器应答。Esc 行为不变（聚焦后仍是「拒绝」）。

## 2. 行为

| 当前状态 | 按下 Enter | 结果 |
|---|---|---|
| 有审批等待，焦点不在面板内 | 第 1 下 | 焦点移入面板正文区，面板描边高亮，**不表态** |
| 有审批等待，焦点已在面板内 | 第 2 下 | 官方处理器应答「允许一次」 |
| 有审批等待，焦点已在面板内 | 任意一下 | 与官方行为一致（Enter 允许、Esc 拒绝） |
| 焦点在输入框 / 按钮 / 链接上 | 任意一下 | 交还给输入框或该控件，本插件不介入 |
| 没有待审批面板 | 任意一下 | 完全不介入，全局监听空跑 |

## 3. 安装

在 DSH 里（把 profile 名换成你自己的，桌面版默认是 `desktop`）：

```sh
dsh plugin --profile desktop add github:UPxianyu/dsh-easy-approval
```

从 npm（若已发布）或本地目录装（开发时）：

```sh
dsh plugin --profile desktop add dsh-easy-approval
dsh plugin --profile desktop add /path/to/dsh-easy-approval
```

装完重启 `dsh web`，或直接刷新页面——插件是纯客户端，宿主没变时刷新就能加载新的 client bundle。
无需任何配置，没有设置页。

卸载：

```sh
dsh plugin --profile desktop remove dsh-easy-approval
```

## 4. 刻意不做的事（守卫）

- **不抢输入框**：焦点在 `input` / `textarea` / `select` / `contenteditable` 时完全不介入，
  「Enter 发送、Shift+Enter 换行、Esc 收起联想」都还是输入框的。
- **不抢已聚焦的控件**：焦点在 `button` / `a[href]` / `[role="button"]` 上时交还浏览器原生激活，
  与官方处理器的规则一致，避免一次 Enter 触发两个动作。
- **不抢组合键与长按**：`Ctrl` / `Meta` / `Alt` / `Shift` 组合与 `event.repeat` 一律放过。
- **不抢输入法**：`isComposing` / `keyCode === 229` 时放过——那是在选候选词，不是回答审批。
- **不替你点按钮**：插件只调用 `focus()`，批准/拒绝始终由 DSH 官方处理器执行，
  所以「回答后按钮 disabled、不可能重复应答」这条官方保证原样保留。
- **不碰面板内容**：不插入 DOM、不改文案、不发请求、不写 session。
- **只看在屏幕上的面板**：落在 `inert` / `hidden` 子树内、或 `visibility: hidden` 的面板不会被选中；
  `aria-busy="true"`（已应答）的面板也跳过。

## 5. 可能的冲突（请先读这一段）

**5.1 与「一步 Enter 直接批准」类插件互斥（最重要）**

以下插件在 Enter 上做的事正好比本插件多一步：

- [`dsh-approval-hotkeys`](https://github.com/SiriLee/dsh-approval-hotkeys)（npm，`Esc` 拒绝）
- [`dsh-enter-approve`](https://github.com/mad-zero-mess/dsh-enter-approve)
- [`dsh-approval-autofocus`](https://github.com/chupeter854-lang/dsh-approval-autofocus)

它们在第一下 Enter 就直接点「允许一次」。与本插件同时启用时，**第一下 Enter 就会被它们应答**，
本插件的「先选中、再通过」退化成一步，同时两份全局 keydown 监听还会争抢同一次按键。
**请只装其中一个。**

**5.2 与其他全局键盘监听的插件**

凡是在 `document` / `window` 上监听 Enter 的插件（Enter 队列、输入框增强、宏工具、屏幕阅读器脚本等）
都可能与这里争抢同一次 keydown。本插件的取值很窄：只在「有待审批面板 ∧ 焦点不在面板内 ∧
目标不是输入框或控件」时 `preventDefault()`，其余一律放行。若你发现某个插件与它抢键，
请按 5.3 的方式反馈，而不是同时安装多份猜测。

**5.3 与 DSH 上游改版**

本插件依赖 DSH 渲染出的几个锚点（见第 6 节）。上游若改名或改结构，插件会**静默失效**（第一下 Enter
什么都不做，回到「需要先点面板」的旧状态），而**不会因此误批**——这是有意设计：宁可退化，不可越权。

**5.4 与向审批面板注入按钮的插件**

有的插件会在审批面板里加按钮（例如 diff 折叠）。本插件聚焦的是面板**正文区**（`role="group"`），
不按位置解析按钮，因此不受影响。只有在正文区缺失的兜底路径下，才会回退到「动作行最后一个按钮」，
那时按钮顺序变化会影响**聚焦目标**；但通过与否仍由官方处理器决定，不会改变语义。

**5.5 与移动端 / 触屏**

本插件只补键盘路径。触屏与移动端本来就没有 Enter，行为不变。

## 6. 实现原理

纯客户端模块 `client.js`，一个 `document` keydown 监听 + 一条聚焦描边的样式：

1. 按键是裸 `Enter`（无修饰键、非连发、非输入法组字），且 `event.target` 不在输入框或控件内；
2. 找第一个**可见且未应答**的 `[data-approval-key]` 面板；找不到就什么都不做；
3. 若焦点已经在面板内 → 放行，让官方处理器应答；
4. 否则 `preventDefault()` 并把焦点移到面板正文区（`[role="group"][tabindex]`）；
   聚焦由键盘触发，浏览器的焦点环语义与「用 Tab 走进面板」一致；
5. 下一记 Enter 从面板内部冒泡，官方处理器接手 → 「允许一次」。

聚焦反馈只用主题令牌（`--dsw-alias-brand-primary`），不写死颜色：

```css
[data-approval-key]:focus-within > div:first-child {
  outline: 2px solid var(--dsw-alias-brand-primary);
  outline-offset: 2px;
  border-radius: var(--dsw-radius-xl, 16px);
}
```

所有资源（监听器、样式）都注册在 `ctx.effect` 里，插件卸载或 HMR 重载时一并移除。

## 7. 兼容范围

- 已在 **DSH 0.2.1-rc.2**（Windows 桌面版）上按上述源码核对并安装验证。
- `package.json` 声明 `dsh.engines.dsh = ">=0.2.1-rc.2 <0.3.0-0"`：DSH 0.2.x 起，`dsh.engines.dsh`
  这一个字段独占决定插件准入，窗口外的版本会在启动时被整个跳过，所以这里给的是核实过的窄窗口，
  而不是「大概能用」的宽范围。
- 早期 0.2.0 系列没有核实过；如果需要在更旧的版本上使用，请自行放宽并复测第 2 节的行为表。

## 8. 自测步骤

1. 触发一次需要审批的操作（例如让 Agent 在工作区外写文件、或执行需要审批的命令）；
2. **不要点面板**，把注意力留在对话区，按一下 Enter → 审批卡片出现品牌色描边，按钮没有被触发；
3. 再按一下 Enter → 面板应答「允许一次」，并进入已应答（`aria-busy`）状态；
4. 重复步骤 1，先按 Esc → 什么都不发生（未聚焦时官方不接管）；聚焦面板后按 Esc → 「拒绝」；
5. 在输入框里打字并按 Enter → 正常发送，插件不介入。

## 9. 仓库规范 / 发布前检查

- [x] `package.json` 已填 `repository` / `homepage` / `bugs`（`UPxianyu/dsh-easy-approval`）
- [ ] 需要发 npm 时确认包名 `dsh-easy-approval` 未被占用，再 `npm publish --access public`
- [ ] 若要进 dsh-market：给仓库打 tag、写清 `dsh.engines.dsh` 的核实版本
- [x] 版权行已填（`Copyright (c) 2026 UPxianyu`）；换署名时改 [LICENSE](LICENSE)

## 10. 安全

见 [SECURITY.md](SECURITY.md)：只有页面内一个 keydown 监听与一条样式，无网络、无文件、无凭据、
无 host 侧代码。

## 11. 许可

[MIT](LICENSE)
