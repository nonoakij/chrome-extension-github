const element = document.createElement("button");
element.id = "chromeExtensionGithub-nonoakij";
element.innerText = "マージコミットをコピーする";

const comparePage = window.location.href.includes("/compare");

let selector: string;
let target: string;

if (comparePage) {
  element.classList.add("btn", "btn-sm", "branch");
  selector = '[data-hovercard-type="pull_request"]';
  target = ".range-editor";
} else {
  element.classList.add(
    "btn",
    "btn-sm",
    "js-details-target",
    "d-inline-block",
    "float-left",
    "float-none",
    "m-0",
    "mr-md-0",
    "js-title-edit-button"
  );
  selector =
    "[data-test-selector=pr-timeline-commits-list] [data-hovercard-type=pull_request]";
  target = ".timeline-comment-actions";
}

element.onclick = function () {
  const text = [...new Array(document.querySelectorAll(selector))].reduce(
    (p, c) => {
      if (!(c instanceof HTMLAnchorElement)) {
        return p;
      }
      const link = c.href.split("https://github.com/")[1];
      return p.concat(`<li>${link}</li>`);
    },
    ""
  );
  window.navigator.clipboard.writeText(`<ul>${text}</ul>`).then(() => {
    alert("コピーしました");
  });
};

window.document.querySelector(target)?.prepend(element);
