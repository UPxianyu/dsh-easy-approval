/**
 * dsh-easy-approval — two-step Enter for pending approvals.
 *
 * The harness ships approval hotkeys, but they are bound to the panel element and
 * require the focus to be inside it (`event.currentTarget.contains(document.activeElement)`),
 * so Enter does nothing until the user clicks the panel.
 *
 * This module adds the missing half without answering anything itself:
 *   first Enter  → focus the panel's own body group (the panel now "owns" the keyboard)
 *   second Enter → the harness handler answers "allow once"
 *   Esc          → unchanged, answered by the harness handler once focused
 *
 * Nothing is clicked, no request is sent, and no harness module is imported.
 */
window.__ModuleLoader__.load({
  id: 'dsh-easy-approval',
  factory() {
    /** Harness anchor for one pending approval (set by dsh-client-ui-approval). */
    const PANEL_SELECTOR = '[data-approval-key]';
    /** The panel's scrollable body: the one element inside it that takes focus (tabIndex 0). */
    const GROUP_SELECTOR = '[role="group"][tabindex]';
    /** Elements that own Enter themselves; never steal the key from them. */
    const EDITABLE_SELECTOR =
      'input, textarea, select, [contenteditable=""], [contenteditable="true"], [contenteditable="plaintext-only"]';
    /** Same rule as the harness handler: a focused control keeps its native Enter. */
    const CONTROL_SELECTOR = 'button, a[href], [role="button"]';

    /**
     * Whether an element is really on screen.
     * `inert` and `visibility: hidden` leave `offsetParent`/rects set, so they need explicit checks.
     */
    function isOnScreen(element) {
      if (element.closest('[inert], [hidden]') !== null) return false;
      const style = window.getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      return element.getClientRects().length > 0;
    }

    /** The first approval panel that is still waiting for an answer, or null. */
    function pendingPanel() {
      for (const panel of document.querySelectorAll(PANEL_SELECTOR)) {
        if (panel.getAttribute('aria-busy') === 'true') continue; // already answered
        if (isOnScreen(panel)) return panel;
      }
      return null;
    }

    /**
     * The element that receives the "selected" state inside one panel.
     * The body group is preferred so a stray Enter stays a decision the harness makes;
     * the confirm button is only a fallback for a panel that lost its body group.
     */
    function selectionTarget(panel) {
      const group = panel.querySelector(GROUP_SELECTOR);
      if (group !== null) return group;
      const buttons = panel.querySelectorAll('button');
      return buttons.length === 0 ? null : buttons[buttons.length - 1];
    }

    /** Handle one keydown: select the panel, or step aside. */
    function onKeyDown(event) {
      if (event.defaultPrevented || event.key !== 'Enter') return;
      if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
      if (event.repeat || event.isComposing || event.keyCode === 229) return;
      const target = event.target;
      if (target instanceof Element) {
        if (target.closest(EDITABLE_SELECTOR) !== null) return;
        if (target.closest(CONTROL_SELECTOR) !== null) return;
      }
      const panel = pendingPanel();
      if (panel === null) return;
      if (panel.contains(document.activeElement)) return; // the harness handler owns this Enter
      const next = selectionTarget(panel);
      if (next === null) return;
      event.preventDefault();
      next.focus();
    }

    /** Focus feedback only: the panel card gets the brand ring while it holds the keyboard. */
    const STYLE = [
      '[data-approval-key]:focus-within > div:first-child {',
      '  outline: 2px solid var(--dsw-alias-brand-primary);',
      '  outline-offset: 2px;',
      '  border-radius: var(--dsw-radius-xl, 16px);',
      '}',
    ].join('\n');

    return {
      apply(ctx) {
        ctx.effect(() => {
          const style = document.createElement('style');
          style.dataset.plugin = 'dsh-easy-approval';
          style.textContent = STYLE;
          document.head.appendChild(style);
          document.addEventListener('keydown', onKeyDown);
          return () => {
            document.removeEventListener('keydown', onKeyDown);
            style.remove();
          };
        });
      },
    };
  },
});
