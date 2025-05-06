const element = document.createElement("button");
element.id = "chromeExtensionGithub-nonoakij";
element.innerText = "Copy Marge commit";

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
		"js-title-edit-button",
	);
	selector = "code > a.issue-link.js-issue-link";
	target = ".timeline-comment-actions";
}

element.onclick = async () => {
	await ExpandOmittedCommits();
	const anchorElementList =
		document.querySelectorAll<HTMLAnchorElement>(selector);
	let text = "";
	for (const anchorElement of Array.from(anchorElementList)) {
		const link = anchorElement.href.split("https://github.com/")[1];
		text = text.concat(`<li>${link}</li>`);
	}
	window.navigator.clipboard
		.writeText(`## Merge commits \n<ul>${text}</ul>`)
		.then(() => {
			alert("Copied to clipboard");
		});
};

window.document.querySelector(target)?.prepend(element);

function ExpandOmittedCommits() {
	return new Promise((resolve) => {
		function recursivelyExpandOmittedCommits() {
			const loadMoreElem = document.querySelector("button.ajax-pagination-btn");
			if (loadMoreElem instanceof HTMLButtonElement) {
				loadMoreElem.click();
				setTimeout(recursivelyExpandOmittedCommits, 1000);
			} else {
				resolve(true);
			}
		}
		recursivelyExpandOmittedCommits();
	});
}
