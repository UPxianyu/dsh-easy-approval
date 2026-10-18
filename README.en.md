# dsh-easy-approval

Two-step Enter for approval panels in the DeepSeek Harness Web UI:

> While an approval is waiting, **the first Enter only selects the panel** (it gets the brand focus
> ring) and **the second Enter allows it**. No mouse click on the panel first.

[中文](README.md) · MIT · browser-only: no host logic, no network, no file access ·
repo <https://github.com/UPxianyu/dsh-easy-approval>

---

## 1. The problem

The harness does ship approval hotkeys, but the handler is bound to the panel element and requires the
focus to be inside it. In `@deepseek-ai/dsh-client-ui-approval` `lib/client.js` (0.2.1-rc.2):

```js
const keydown = (event) => {
  const element = event.target;
  if (event.defaultPrevented
      || !event.currentTarget.contains(document.activeElement)   // ← focus must already be in the panel
      || element.closest('input, textarea, select, [contenteditable="true"], [contenteditable=""]') !== null) return;
  ...
  answer(event.key === "Enter" ? "allowed-once" : "rejected");
};
```

So with the focus in the conversation, on the page background or in the sidebar, Enter never reaches that
code — you have to click the panel first. Approvals are interruptions: your attention is usually elsewhere
when the panel appears, and reaching for the mouse is slower and easier to misclick than two Enters.

This plugin adds the missing half and **does not decide for you**: the first press only moves focus into the
panel, the second press is answered by the official handler. Esc is unchanged (reject, once focused).

## 2. Behavior

| State | Enter | Result |
|---|---|---|
| Approval pending, focus outside the panel | 1st press | Focus moves into the panel body, card is ringed, **nothing is answered** |
| Approval pending, focus inside the panel | 2nd press | The official handler answers "allow once" |
| Approval pending, focus inside the panel | any press | Identical to stock behavior (Enter allows, Esc rejects) |
| Focus in an input / on a button / on a link | any press | Handed back to that element; this plugin stays out |
| No pending approval | any press | No interference at all |

## 3. Install

```sh
dsh plugin --profile desktop add github:UPxianyu/dsh-easy-approval
```

From npm (once published) or a local checkout (development):

```sh
dsh plugin --profile desktop add dsh-easy-approval
dsh plugin --profile desktop add /path/to/dsh-easy-approval
```

Restart `dsh web`, or simply refresh the page — the plugin is client-only, so a refresh picks up the new
client bundle when the host side did not change. No configuration, no settings page.

Remove it with `dsh plugin --profile desktop remove dsh-easy-approval`.

## 4. What it deliberately does not do

- **Never while typing**: focus inside `input` / `textarea` / `select` / `contenteditable` is left alone.
- **Never on an already focused control**: `button` / `a[href]` / `[role="button"]` keep their native Enter,
  matching the harness rule so one Enter never triggers two actions.
- **Never on chords or repeats**: `Ctrl` / `Meta` / `Alt` / `Shift` combinations and `event.repeat` are ignored.
- **Never mid-composition**: `isComposing` / `keyCode === 229` is candidate selection, not an answer.
- **Never clicks a button**: only `focus()` is called, so answering still goes through the official handler
  and its "disabled after answer, no double answer" guarantee stays intact.
- **Never touches panel content**: no DOM insertion, no copy changes, no requests, no session writes.
- **Only on-screen panels**: panels inside `inert` / `hidden` subtrees or hidden via `visibility: hidden` are
  skipped, as are panels with `aria-busy="true"` (already answered).

## 5. Possible conflicts

**5.1 Mutually exclusive with "one Enter approves" plugins** — such as
[`dsh-approval-hotkeys`](https://github.com/SiriLee/dsh-approval-hotkeys),
[`dsh-enter-approve`](https://github.com/mad-zero-mess/dsh-enter-approve) and
[`dsh-approval-autofocus`](https://github.com/chupeter854-lang/dsh-approval-autofocus).
They answer on the first Enter, so the selection step disappears and two global keydown listeners compete
for the same key. Install only one of them.

**5.2 Other global keyboard listeners** (Enter queues, composer enhancers, macro tools, screen readers) may
compete with this plugin. Its footprint is narrow: it only calls `preventDefault()` when an approval panel is
pending, the focus is outside it, and the target is neither an editable field nor a control.

**5.3 Upstream UI changes**: the plugin depends on a few anchors (section 6). If the harness renames or
restructures them, the plugin silently degrades to stock behavior (first Enter does nothing) and **cannot
misapprove** — degrading is intentional, over-approving is not.

**5.4 Plugins that inject buttons into the approval panel** (for example a diff-collapse toggle) are not
affected: this plugin focuses the panel body (`role="group"`) instead of resolving buttons by position. Only
the fallback path (panel body missing) relies on button order, and even then the decision still belongs to
the official handler.

**5.5 Mobile / touch**: this plugin only completes the keyboard path; touch behavior is unchanged.

## 6. How it works

One `document` keydown listener plus one style rule, in `client.js`:

1. bare `Enter` (no modifiers, not repeated, not IME-composing) whose target is not editable or a control;
2. find the first visible, unanswered `[data-approval-key]` panel — otherwise do nothing;
3. if focus is already inside the panel, step aside and let the official handler answer;
4. otherwise `preventDefault()` and focus the panel body (`[role="group"][tabindex]`), so the browser's focus
   semantics match "tabbed into the panel";
5. the next Enter bubbles from inside the panel and the official handler answers "allow once".

The focus ring uses theme tokens only (`--dsw-alias-brand-primary`). Listener and stylesheet are registered in
`ctx.effect` and removed on unload or HMR reload.

## 7. Compatibility

Verified against the source above and installed on **DSH 0.2.1-rc.2** (Windows desktop). The manifest declares
`dsh.engines.dsh = ">=0.2.1-rc.2 <0.3.0-0"`; since DSH 0.2.x that single field alone decides plugin admission,
so the window stays as narrow as what was actually verified. Earlier 0.2.0 builds are untested.

## 8. Manual test

1. Trigger an operation that needs approval (e.g. write outside the workspace, or run an approval-gated command).
2. **Do not click the panel**; keep the focus in the conversation and press Enter once → the card gets the brand
   ring and no button fires.
3. Press Enter again → the panel answers "allow once" and becomes `aria-busy`.
4. Repeat and press Esc without focusing → nothing happens (stock behavior); focus the panel and press Esc → reject.
5. Type in the composer and press Enter → the message still sends; the plugin stays out.

## 9. Pre-publish checklist

- [x] `repository` / `homepage` / `bugs` filled in (`UPxianyu/dsh-easy-approval`).
- [ ] For npm: confirm the name `dsh-easy-approval` is free, then `npm publish --access public`.
- [ ] For dsh-market: tag a release and state the verified `dsh.engines.dsh` window.
- [x] Copyright line filled in (`Copyright (c) 2026 UPxianyu`); edit [LICENSE](LICENSE) to change it.

## 10. Security

See [SECURITY.md](SECURITY.md): one keydown listener and one style rule in the page — no network, no files,
no credentials, no host-side code.

## 11. License

[MIT](LICENSE)
