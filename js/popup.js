window.onload = function () {
  main();
  setupEvents();
};
function setupEvents() {

  document.getElementById("refresh").addEventListener('click', refreshLinks, false);

}
function main() {
  if (localStorage['HN.NumLinks'] === null) {
    buildPopupAfterResponse = true;
    UpdateFeed();
  }
  else {
    buildPopup(RetrieveLinksFromLocalStorage());
  }
}

function buildPopup(links) {
  var header = document.getElementById("header");
  var feed = document.getElementById("feed");



  for (var i = 0; i < links.length; i++) {
    hnLink = links[i];
    var row = document.createElement("tr");
    row.className = "link";
    var num = document.createElement("td");
    num.innerText = i + 1;
    var link_col = document.createElement("td")
    var title = document.createElement("a");
    title.className = "link_title";
    title.innerText = hnLink.Title;
    title.href = hnLink.Link;
    title.addEventListener("click", openLink);
    var comments = document.createElement("a");
    comments.className = "comments";
    comments.innerText = "(comments)";
    comments.href = hnLink.CommentsLink;
    comments.addEventListener("click", openLink);
    link_col.appendChild(title);
    link_col.appendChild(comments);
    row.appendChild(num);
    row.appendChild(link_col)
    feed.appendChild(row);
  }
  hideElement("spinner");
  showElement("container");
}



function refreshLinks() {
  var linkTable = document.getElementById("feed");
  while (linkTable.hasChildNodes()) linkTable.removeChild(linkTable.firstChild); 
  toggle("container");
  toggle("spinner");
  buildPopupAfterResponse = true;
  UpdateFeed();
  updateLastRefreshTime();
}



