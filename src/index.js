var _a;
var element = document.createElement("button");
element.id = "chromeExtensionGithub-nonoakij";
element.innerText = "マージコミットをコピーする";
var comparePage = window.location.href.includes("/compare");
var selector;
var target;
if (comparePage) {
    element.classList.add("btn", "btn-sm", "branch");
    selector = '[data-hovercard-type="pull_request"]';
    target = ".range-editor";
}
else {
    element.classList.add("btn", "btn-sm", "js-details-target", "d-inline-block", "float-left", "float-none", "m-0", "mr-md-0", "js-title-edit-button");
    selector = "a.issue-link.js-issue-link";
    target = ".timeline-comment-actions";
}
element.onclick = function () {
    var anchorElementList = document.querySelectorAll(selector);
    var text = "";
    anchorElementList.forEach(function (anchorElement) {
        if (!(anchorElement instanceof HTMLAnchorElement))
            return;
        var link = anchorElement.href.split("https://github.com/")[1];
        return text.concat("<li>".concat(link, "</li>"));
    });
    window.navigator.clipboard.writeText("<ul>".concat(text, "</ul>")).then(function () {
        alert("コピーしました");
    });
};
(_a = window.document.querySelector(target)) === null || _a === void 0 ? void 0 : _a.prepend(element);
