var currentFeed = "HN";

window.onload = function () {
  main();
  setupEvents();
};

function setupEvents() {
  document.getElementById("refresh").addEventListener('click', refreshLinks, false);

  var tabs = document.querySelectorAll('.tab-button');
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      switchTab(this.getAttribute('data-feed'));
    });
  });
}

function switchTab(feedKey) {
  if (currentFeed === feedKey) return;

  currentFeed = feedKey;

  // Update UI
  document.querySelectorAll('.tab-button').forEach(function (btn) {
    if (btn.getAttribute('data-feed') === feedKey) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Re-build popup
  buildPopup(RetrieveLinksFromLocalStorage(currentFeed));

  // If no links cached, update
  if (!RetrieveLinksFromLocalStorage(currentFeed)) {
    refreshLinks();
  }
}

function main() {
  var links = RetrieveLinksFromLocalStorage(currentFeed);
  if (links === null) {
    buildPopupAfterResponse = true;
    UpdateFeed(currentFeed);
  }
  else {
    buildPopup(links);
  }
}

function buildPopup(links) {
  var feed = document.getElementById("feed");

  // Clear existing feed
  while (feed.hasChildNodes()) feed.removeChild(feed.firstChild);

  if (!links || links.length === 0) {
    var row = document.createElement("tr");
    var col = document.createElement("td");
    col.innerText = "No items found. Try refreshing.";
    col.className = "error";
    row.appendChild(col);
    feed.appendChild(row);
    showElement("container");
    hideElement("spinner");
    return;
  }

  for (var i = 0; i < links.length; i++) {
    var item = links[i];
    var row = document.createElement("tr");
    row.className = "link";
    var num = document.createElement("td");
    num.innerText = i + 1;
    var link_col = document.createElement("td")
    var title = document.createElement("a");
    title.className = "link_title";
    title.innerText = item.Title;
    title.href = item.Link;
    title.addEventListener("click", openLink);

    link_col.appendChild(title);

    // Some feeds might not have comments (like LWN occasionally or depending on RSS)
    if (item.CommentsLink) {
      var comments = document.createElement("a");
      comments.className = "comments";
      comments.innerText = "(comments)";
      comments.href = item.CommentsLink;
      comments.addEventListener("click", openLink);
      link_col.appendChild(comments);
    }

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

  hideElement("container");
  showElement("spinner");

  buildPopupAfterResponse = true;
  UpdateFeed(currentFeed);
  updateLastRefreshTime(currentFeed);
}



