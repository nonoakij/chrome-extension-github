const element = document.createElement("button");
element.id = "chromeExtensionGithub-nonoakij";
element.classList = "btn btn-sm branch";
element.innerText = "マージコミットをコピーする";
element.onclick = function() {
  const text = [...document.querySelectorAll('[data-hovercard-type="pull_request"]')].reduce((all,c)=>{ var link = c.href.split('https://github.com/')[1]; return all ? `${all}<li>${link}</li>` : `<li>${link}</li>`},'');
  window.navigator.clipboard.writeText(`<ul>${text}</ul>`).then(e => {
    alert('コピーしました');
  });
};

document.querySelector('.range-editor').prepend(element);