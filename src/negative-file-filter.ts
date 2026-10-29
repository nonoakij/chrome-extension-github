const panelId = "chrome-extension-github-exclude-filter";
const hiddenClass = "chrome-extension-github-exclude-filter-hidden";
const styleId = "chrome-extension-github-exclude-filter-style";

type FileEntry = {
  path: string;
  treeItem?: HTMLElement;
  diff?: HTMLElement;
};

export function parseExcludeTerms(value: string): string[] {
  return value
    .split(",")
    .map((term) => term.trim().toLowerCase())
    .filter(Boolean);
}

export function shouldExcludePath(path: string, terms: string[]): boolean {
  const normalizedPath = path.toLowerCase();
  return terms.some((term) => normalizedPath.includes(term));
}

export function setupNegativeFileFilter() {
  let page = "";
  let query = "";
  let scheduled = false;

  function isFilesChangedPage() {
    return /^\/[^/]+\/[^/]+\/pull\/\d+\/(?:changes|files)\/?$/.test(location.pathname);
  }

  function ensureStyle() {
    if (document.getElementById(styleId)) return;
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      .${hiddenClass} {
        display: none !important;
      }

      #${panelId} {
        margin-top: 12px;
      }

      #${panelId} .chrome-extension-github-exclude-filter-heading {
        align-items: baseline;
        display: flex;
        gap: 8px;
        justify-content: space-between;
        margin-bottom: 6px;
      }

      #${panelId} label {
        color: var(--fgColor-default, var(--color-fg-default));
        font-size: 12px;
        font-weight: 600;
      }

      #${panelId} output {
        color: var(--fgColor-muted, var(--color-fg-muted));
        font-size: 11px;
      }

      #${panelId} input {
        background-color: var(--bgColor-default, var(--color-canvas-default));
        border: 1px solid var(--borderColor-default, var(--color-border-default));
        border-radius: 6px;
        box-sizing: border-box;
        color: var(--fgColor-default, var(--color-fg-default));
        font: inherit;
        line-height: 20px;
        min-height: 32px;
        padding: 5px 12px;
        width: 100%;
      }

      #${panelId} input::placeholder {
        color: var(--fgColor-muted, var(--color-fg-subtle));
      }

      #${panelId} input:focus {
        border-color: var(--focus-outlineColor, var(--color-accent-fg));
        box-shadow: inset 0 0 0 1px var(--focus-outlineColor, var(--color-accent-fg));
        outline: none;
      }
    `;
    document.head.append(style);
  }

  function nativeFilterInput() {
    return document.querySelector<HTMLInputElement>(
      '#diff-file-tree-filter input[placeholder^="Filter files"], input[aria-label^="Filter files"], #file-tree-filter-field',
    );
  }

  function insertionAnchor(input: HTMLInputElement) {
    return (
      input.closest<HTMLElement>("#diff-file-tree-filter") ??
      input.closest<HTMLElement>(".subnav-search") ??
      input.parentElement
    );
  }

  function createPanel() {
    const panel = document.createElement("div");
    panel.id = panelId;

    const heading = document.createElement("div");
    heading.className = "chrome-extension-github-exclude-filter-heading";

    const label = document.createElement("label");
    label.htmlFor = `${panelId}-input`;
    label.textContent = "Files to exclude";

    const status = document.createElement("output");
    status.setAttribute("for", `${panelId}-input`);
    status.setAttribute("aria-live", "polite");

    const input = document.createElement("input");
    input.id = `${panelId}-input`;
    input.type = "search";
    input.placeholder = "e.g. pnpm-lock, generated/";
    input.autocomplete = "off";
    input.spellcheck = false;
    input.value = query;
    input.addEventListener("input", () => {
      query = input.value;
      scheduleSync();
    });

    heading.append(label, status);
    panel.append(heading, input);
    return panel;
  }

  function mountPanel() {
    const existing = document.getElementById(panelId);
    if (existing) return existing;
    const nativeInput = nativeFilterInput();
    const anchor = nativeInput && insertionAnchor(nativeInput);
    if (!anchor) return;
    const panel = createPanel();
    anchor.after(panel);
    return panel;
  }

  function cleanPath(path: string) {
    // GitHub surrounds paths with bidi-control characters in some diff headings.
    return path.replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, "").trim();
  }

  function treeRoots(): HTMLElement[] {
    return Array.from(
      document.querySelectorAll<HTMLElement>(
        '#pr-file-tree, file-tree, [role="tree"][aria-label="File Tree"]',
      ),
    );
  }

  function collectEntries(): FileEntry[] {
    const entries = new Map<string, FileEntry>();

    for (const root of treeRoots()) {
      for (const link of root.querySelectorAll<HTMLAnchorElement>('a[href^="#diff-"]')) {
        const id = link.getAttribute("href")?.slice(1);
        if (!id) continue;
        const treeItem = link.closest<HTMLElement>(
          '[role="treeitem"], [data-tree-entry-type="file"]',
        );
        const diff = document.getElementById(id);
        const oldPath = treeItem?.querySelector<HTMLElement>(
          "[data-filterable-item-text]",
        )?.textContent;
        const path = cleanPath(
          oldPath ??
            (treeItem?.id && !treeItem.id.startsWith("file-tree-item-diff-")
              ? treeItem.id
              : (diff?.getAttribute("data-tagsearch-path") ?? link.textContent ?? "")),
        );
        if (!path) continue;
        entries.set(id, { path, treeItem: treeItem ?? undefined, diff: diff ?? undefined });
      }
    }

    for (const diff of document.querySelectorAll<HTMLElement>(
      '[id^="diff-"][role="region"], [id^="diff-"][data-tagsearch-path]',
    )) {
      const heading = diff.querySelector<HTMLElement>(`a[href="#${diff.id}"] code`);
      const path = cleanPath(
        diff.getAttribute("data-tagsearch-path") ??
          diff.getAttribute("data-file-path") ??
          heading?.textContent ??
          "",
      );
      if (!path) continue;
      const entry = entries.get(diff.id);
      entries.set(diff.id, { path, treeItem: entry?.treeItem, diff });
    }

    return Array.from(entries.values());
  }

  function setHidden(element: HTMLElement | undefined, hidden: boolean) {
    if (element?.classList.contains(hiddenClass) !== hidden) {
      element?.classList.toggle(hiddenClass, hidden);
    }
  }

  function updateDirectories(fileItems: Set<HTMLElement>) {
    for (const root of treeRoots()) {
      const directories = Array.from(
        root.querySelectorAll<HTMLElement>('[role="treeitem"]'),
      ).filter((item) => !fileItems.has(item));
      for (const directory of directories.reverse()) {
        const descendants = Array.from(fileItems).filter((item) => directory.contains(item));
        setHidden(
          directory,
          descendants.length > 0 &&
            descendants.every((item) => item.classList.contains(hiddenClass)),
        );
      }
    }
  }

  function clearHiddenElements() {
    for (const element of document.querySelectorAll<HTMLElement>(`.${hiddenClass}`)) {
      element.classList.remove(hiddenClass);
    }
  }

  function applyFilter(panel: HTMLElement | undefined) {
    const terms = parseExcludeTerms(query);
    const entries = collectEntries();
    const fileItems = new Set(entries.flatMap((entry) => (entry.treeItem ? [entry.treeItem] : [])));
    let excluded = 0;

    for (const entry of entries) {
      const hidden = shouldExcludePath(entry.path, terms);
      if (hidden) excluded += 1;
      setHidden(entry.treeItem, hidden);
      setHidden(entry.diff, hidden);
    }
    updateDirectories(fileItems);

    const status = panel?.querySelector<HTMLOutputElement>("output");
    const message = excluded ? `${excluded} excluded` : "";
    if (status && status.textContent !== message) status.textContent = message;
  }

  function sync() {
    scheduled = false;
    const nextPage = location.pathname + location.search;
    if (page !== nextPage) {
      page = nextPage;
      query = "";
      clearHiddenElements();
      document.getElementById(panelId)?.remove();
    }
    if (!isFilesChangedPage()) {
      clearHiddenElements();
      document.getElementById(panelId)?.remove();
      return;
    }
    ensureStyle();
    const panel = mountPanel();
    applyFilter(panel);
  }

  function scheduleSync() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(sync);
  }

  new MutationObserver(scheduleSync).observe(document.body, { childList: true, subtree: true });
  window.addEventListener("popstate", scheduleSync);
  document.addEventListener("turbo:load", scheduleSync);
  sync();
}
