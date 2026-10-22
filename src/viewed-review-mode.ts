const viewedSelector =
  'button[aria-label="Not Viewed"][aria-pressed], button[aria-label="Viewed"][aria-pressed]';

type ViewedFile = { id: string; button: HTMLButtonElement };

export function setupViewedReviewMode() {
  const panel = document.createElement("li");
  panel.id = "chrome-extension-github-viewed-mode";
  const toggle = panel;
  toggle.tabIndex = -1;
  toggle.setAttribute("role", "menuitemcheckbox");
  toggle.title =
    "↑↓: 全ファイルを移動 / Shift+↑↓: 未確認のみ移動 / Space・Enter: Viewed / Esc: 終了";
  const status = document.createElement("span");
  status.setAttribute("role", "status");
  status.className = "sr-only";

  function settingsButton() {
    return document.querySelector<HTMLButtonElement>(
      'button[aria-label="Open diff view settings"]',
    );
  }

  function compactItem() {
    return Array.from(document.querySelectorAll<HTMLElement>('[role="menuitemcheckbox"]')).find(
      (item) => item.textContent?.trim() === "Compact line height",
    );
  }

  function mountMenuItem() {
    const compact = compactItem();
    if (!compact || compact.nextElementSibling === panel) return;
    // Reuse GitHub's menu styling, including the checkmark controlled by aria-checked.
    toggle.className = compact.className;
    for (const attribute of Array.from(compact.attributes)) {
      if (attribute.name.startsWith("data-")) toggle.setAttribute(attribute.name, attribute.value);
    }
    const content = compact.cloneNode(true) as HTMLElement;
    for (const node of content.querySelectorAll("[id]")) node.removeAttribute("id");
    toggle.replaceChildren(...Array.from(content.childNodes));
    compact.after(panel);
  }

  let active = false;
  let currentId: string | undefined;
  let pendingId: string | undefined;
  let page = "";
  let scheduled = false;

  function files(): ViewedFile[] {
    return Array.from(document.querySelectorAll<HTMLButtonElement>(viewedSelector)).flatMap(
      (button) => {
        const diff = button.closest<HTMLElement>('[id^="diff-"]');
        return diff && !button.disabled && button.getClientRects().length
          ? [{ id: diff.id, button }]
          : [];
      },
    );
  }

  function unviewed(file: ViewedFile) {
    return file.button.getAttribute("aria-pressed") === "false";
  }

  function render() {
    const label = "未確認レビューモード";
    const labelElement = toggle.querySelector('[data-component="ActionList.Item.Label"]') ?? toggle;
    if (labelElement.textContent !== label) labelElement.textContent = label;
    if (toggle.getAttribute("aria-checked") !== String(active)) {
      toggle.setAttribute("aria-checked", String(active));
    }
    const remaining = files().filter(unviewed).length;
    const message = active
      ? remaining
        ? `未確認 ${remaining} 件 · ↑↓ 全ファイル / Shift+↑↓ 未確認 / Space 確認 / Esc 終了`
        : "表示中の未確認ファイルはありません"
      : "";
    if (status.textContent !== message) status.textContent = message;
  }

  function focusFile(file: ViewedFile | undefined) {
    if (!file) return;
    currentId = file.id;
    file.button.focus({ preventScroll: true });
    // Center the header so GitHub's sticky toolbars do not cover the Viewed button.
    file.button.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" });
  }

  function move(direction: 1 | -1, { onlyUnviewed = false, wrap = false } = {}) {
    const all = files();
    const index = all.findIndex((file) => file.id === currentId);
    const candidates = direction === 1 ? all.slice(index + 1) : all.slice(0, index).reverse();
    const matches = (file: ViewedFile) => !onlyUnviewed || unviewed(file);
    focusFile(candidates.find(matches) ?? (wrap ? all.find(matches) : undefined));
  }

  function stop() {
    active = false;
    currentId = undefined;
    pendingId = undefined;
    render();
  }

  toggle.addEventListener("click", (event) => {
    event.stopPropagation();
    if (active) {
      stop();
      settingsButton()?.click();
    } else {
      active = true;
      render();
      const settings = settingsButton();
      settings?.click();
      // Wait for the menu's focus restoration before focusing the first Viewed button.
      if (settings)
        requestAnimationFrame(() => {
          if (active) focusFile(files().find(unviewed));
        });
      else focusFile(files().find(unviewed));
    }
  });

  document.addEventListener(
    "keydown",
    (event) => {
      if (!(event.target instanceof Element)) return;
      const compact = compactItem();
      if (!compact || !panel.isConnected) return;
      if (event.target === toggle && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        event.stopImmediatePropagation();
        toggle.click();
      } else if (event.target === compact && event.key === "ArrowDown") {
        event.preventDefault();
        event.stopImmediatePropagation();
        toggle.focus();
      } else if (
        event.target === toggle &&
        (event.key === "ArrowUp" || event.key === "ArrowDown")
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
        const next =
          event.key === "ArrowUp"
            ? compact
            : compact.closest('[role="menu"]')?.querySelector<HTMLElement>('[role^="menuitem"]');
        next?.focus();
      }
    },
    true,
  );

  function sync() {
    scheduled = false;
    const nextPage = location.pathname + location.search;
    if (page !== nextPage) {
      page = nextPage;
      stop();
    }
    if (!/^\/[^/]+\/[^/]+\/pull\/\d+\/changes\/?$/.test(location.pathname)) {
      panel.remove();
      status.remove();
      return;
    }
    if (!status.isConnected) document.body.append(status);
    mountMenuItem();
    if (active && pendingId) {
      const checked = files().find((file) => file.id === pendingId);
      // React updates aria-pressed asynchronously and can replace the entire header.
      if (checked && !unviewed(checked)) {
        currentId = pendingId;
        pendingId = undefined;
        move(1, { onlyUnviewed: true, wrap: true });
        if (!files().some(unviewed)) {
          (settingsButton() ?? (panel.isConnected ? toggle : undefined))?.focus({
            preventScroll: true,
          });
        }
      }
    }
    render();
  }

  function scheduleSync() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(sync);
  }

  document.addEventListener(
    "click",
    (event) => {
      if (!active || !(event.target instanceof Element)) return;
      const button = event.target.closest<HTMLButtonElement>(viewedSelector);
      const file = files().find((entry) => entry.button === button);
      if (file && unviewed(file)) {
        pendingId = file.id;
        currentId = file.id;
        scheduleSync();
      }
    },
    true,
  );

  document.addEventListener("focusin", (event) => {
    if (!active) return;
    const file = files().find((entry) => entry.button === event.target);
    if (file) currentId = file.id;
  });

  document.addEventListener(
    "keydown",
    (event) => {
      if (!active || event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target;
      if (
        target instanceof Element &&
        target.closest(
          'textarea, select, input, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="dialog"], [role="menu"], [aria-modal="true"]',
        )
      )
        return;
      if (event.key === "Escape" && !event.shiftKey) {
        event.preventDefault();
        event.stopImmediatePropagation();
        stop();
        settingsButton()?.focus({ preventScroll: true });
      } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        event.stopImmediatePropagation();
        pendingId = undefined;
        move(event.key === "ArrowDown" ? 1 : -1, { onlyUnviewed: event.shiftKey });
      }
    },
    true,
  );

  new MutationObserver(scheduleSync).observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["aria-pressed", "aria-checked", "aria-label", "disabled"],
  });
  window.addEventListener("popstate", scheduleSync);
  document.addEventListener("turbo:load", scheduleSync);
  sync();
}
