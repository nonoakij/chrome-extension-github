import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { Window } from "happy-dom";
import { setupViewedReviewMode } from "../src/viewed-review-mode.ts";

let window;
let document;
let scrolled;
const globals = [
  "window",
  "document",
  "location",
  "Element",
  "MutationObserver",
  "requestAnimationFrame",
];

beforeEach(() => {
  window = new Window({ url: "https://github.com/owner/repo/pull/123/changes" });
  document = window.document;
  for (const key of globals) globalThis[key] = window[key];
  scrolled = [];
  openMenu();
  // happy-dom has no layout engine; emulate visible controls and record scrolling.
  window.HTMLElement.prototype.getClientRects = function () {
    return this.hidden ? [] : [{}];
  };
  window.HTMLElement.prototype.scrollIntoView = function () {
    scrolled.push(this.closest('[id^="diff-"]')?.id);
  };
});

afterEach(async () => {
  await window.happyDOM.abort();
  for (const key of globals) delete globalThis[key];
});

function openMenu() {
  const menu = document.createElement("ul");
  menu.setAttribute("role", "menu");
  menu.innerHTML =
    '<li role="menuitemcheckbox" tabindex="-1" aria-checked="true"><span data-component="ActionList.Item.Label">Compact line height</span></li>';
  document.body.append(menu);
  return menu;
}

function file(id, viewed = false) {
  const diff = document.createElement("div");
  diff.id = `diff-${id}`;
  diff.innerHTML = `<button aria-label="${viewed ? "Viewed" : "Not Viewed"}" aria-pressed="${viewed}"><span>Viewed</span></button>`;
  document.body.append(diff);
  return diff.querySelector("button");
}

function toggle() {
  return document.querySelector("#chrome-extension-github-viewed-mode");
}

function key(target, value, options = {}) {
  const event = new window.KeyboardEvent("keydown", {
    key: value,
    bubbles: true,
    cancelable: true,
    ...options,
  });
  target.dispatchEvent(event);
  return event;
}

async function settle() {
  await window.happyDOM.waitUntilComplete();
}

await test("activation focuses the first unviewed file; Shift+arrows skip viewed files and stop at boundaries", () => {
  file("already", true);
  const first = file("first");
  file("skip", true);
  const last = file("last");
  setupViewedReviewMode();
  assert.equal(toggle().getAttribute("aria-checked"), "false");
  toggle().click();
  assert.equal(document.activeElement, first);
  assert.equal(key(first, "ArrowUp", { shiftKey: true }).defaultPrevented, true);
  assert.equal(document.activeElement, first);
  key(first, "ArrowDown", { shiftKey: true });
  assert.equal(document.activeElement, last);
  key(last, "ArrowDown", { shiftKey: true });
  assert.equal(document.activeElement, last);
  key(last, "ArrowUp", { shiftKey: true });
  assert.equal(document.activeElement, first);
  assert.deepEqual(scrolled, ["diff-first", "diff-last", "diff-first"]);
});

await test("plain arrows include viewed files in both directions without changing their state", () => {
  const already = file("already", true);
  const first = file("first");
  const viewed = file("viewed", true);
  const last = file("last");
  setupViewedReviewMode();
  toggle().click();
  key(first, "ArrowUp");
  assert.equal(document.activeElement, already);
  key(already, "ArrowUp");
  assert.equal(document.activeElement, already);
  key(already, "ArrowDown");
  assert.equal(document.activeElement, first);
  key(first, "ArrowDown");
  assert.equal(document.activeElement, viewed);
  key(viewed, "ArrowDown");
  assert.equal(document.activeElement, last);
  key(last, "ArrowDown");
  assert.equal(document.activeElement, last);
  key(last, "ArrowUp");
  assert.equal(document.activeElement, viewed);
  key(viewed, "ArrowUp");
  assert.equal(document.activeElement, first);
  assert.equal(already.getAttribute("aria-pressed"), "true");
  assert.equal(viewed.getAttribute("aria-pressed"), "true");
  assert.equal(first.getAttribute("aria-pressed"), "false");
  assert.equal(last.getAttribute("aria-pressed"), "false");
});

await test("waits for GitHub's asynchronous update, including replacement of the clicked header", async () => {
  const first = file("first");
  file("skip", true);
  const next = file("next");
  setupViewedReviewMode();
  toggle().click();
  first.querySelector("span").click();
  await settle();
  assert.equal(document.activeElement, first);
  const replacement = first.cloneNode(true);
  replacement.setAttribute("aria-pressed", "true");
  replacement.setAttribute("aria-label", "Viewed");
  first.replaceWith(replacement);
  await settle();
  assert.equal(document.activeElement, next);
  assert.equal(scrolled.at(-1), "diff-next");
});

await test("checking the last file returns to skipped files, then reports completion", async () => {
  const first = file("first");
  const last = file("last");
  setupViewedReviewMode();
  toggle().click();
  key(first, "ArrowDown");
  last.click();
  last.setAttribute("aria-pressed", "true");
  await settle();
  assert.equal(document.activeElement, first);
  first.click();
  first.setAttribute("aria-pressed", "true");
  await settle();
  assert.equal(document.activeElement, toggle());
  assert.match(document.querySelector('[role="status"]').textContent, /未確認ファイルはありません/);
});

await test("editing, dialogs and modified keys keep native behavior; Escape disables navigation", () => {
  const first = file("first");
  const next = file("next");
  setupViewedReviewMode();
  toggle().click();
  const textarea = document.createElement("textarea");
  document.body.append(textarea);
  textarea.focus();
  assert.equal(key(textarea, "ArrowDown").defaultPrevented, false);
  assert.equal(key(textarea, "ArrowDown", { shiftKey: true }).defaultPrevented, false);
  assert.equal(key(textarea, "Escape").defaultPrevented, false);
  const dialog = document.createElement("div");
  dialog.setAttribute("role", "dialog");
  dialog.innerHTML = "<button>Menu</button>";
  document.body.append(dialog);
  assert.equal(key(dialog.firstChild, "ArrowDown").defaultPrevented, false);
  assert.equal(key(dialog.firstChild, "ArrowUp", { shiftKey: true }).defaultPrevented, false);
  first.focus();
  assert.equal(key(first, "ArrowDown", { ctrlKey: true }).defaultPrevented, false);
  assert.equal(document.activeElement, first);
  key(first, "Escape");
  assert.equal(toggle().getAttribute("aria-checked"), "false");
  assert.equal(key(next, "ArrowDown").defaultPrevented, false);
});

await test("SPA navigation removes the panel and returning starts with the mode off", async () => {
  file("first");
  setupViewedReviewMode();
  toggle().click();
  window.history.pushState({}, "", "/owner/repo/pull/123");
  document.body.append(document.createElement("div"));
  await settle();
  assert.equal(toggle(), null);
  window.history.pushState({}, "", "/owner/repo/pull/456/changes");
  window.dispatchEvent(new window.PopStateEvent("popstate"));
  await settle();
  assert.equal(toggle().getAttribute("aria-checked"), "false");
  assert.equal(document.querySelectorAll("#chrome-extension-github-viewed-mode").length, 1);
});

await test("ignores hidden or disabled controls and includes dynamically loaded files", async () => {
  file("hidden").hidden = true;
  file("disabled").disabled = true;
  file("viewed", true);
  setupViewedReviewMode();
  toggle().click();
  assert.match(document.querySelector('[role="status"]').textContent, /未確認ファイルはありません/);
  const loaded = file("loaded");
  await settle();
  key(document.body, "ArrowDown", { shiftKey: true });
  assert.equal(document.activeElement, loaded);
  assert.match(document.querySelector('[role="status"]').textContent, /未確認 1 件/);
});

await test("the toggle follows Compact line height and survives closing and reopening the menu", async () => {
  file("first");
  setupViewedReviewMode();
  const menu = document.querySelector('[role="menu"]');
  assert.equal(toggle().previousElementSibling.textContent, "Compact line height");
  toggle().click();
  menu.remove();
  await settle();
  assert.equal(toggle(), null);
  openMenu();
  await settle();
  assert.equal(toggle().getAttribute("aria-checked"), "true");
  assert.equal(document.querySelectorAll("#chrome-extension-github-viewed-mode").length, 1);
  const compact = toggle().previousElementSibling;
  key(compact, "ArrowDown");
  assert.equal(document.activeElement, toggle());
  key(toggle(), "ArrowUp");
  assert.equal(document.activeElement, compact);
  toggle().click();
  assert.equal(toggle().getAttribute("aria-checked"), "false");
});
