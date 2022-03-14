const element = document.createElement("button");
element.id = "chromeExtensionGithub-nonoakij";
element.innerText = "マージコミットをコピーする";

const comparePage = window.location.href.includes("/compare");

var selector, target;

if (comparePage) {
  element.classList = "btn btn-sm branch";
  selector = '[data-hovercard-type="pull_request"]';
  target = ".range-editor";
} else {
  element.classList =
    "details-overlay details-reset position-relative js-reaction-popover-container js-comment-header-reaction-button d-none d-md-inline-block";
  selector =
    "[data-test-selector=pr-timeline-commits-list] [data-hovercard-type=pull_request]";
  target = ".timeline-comment-actions";
}

element.onclick = function () {
  const text = [...document.querySelectorAll(selector)].reduce((all, c) => {
    var link = c.href.split("https://github.com/")[1];
    return all ? `${all}<li>${link}</li>` : `<li>${link}</li>`;
  }, "");
  window.navigator.clipboard.writeText(`<ul>${text}</ul>`).then(() => {
    alert("コピーしました");
  });
};

document.querySelector(target).prepend(element);
