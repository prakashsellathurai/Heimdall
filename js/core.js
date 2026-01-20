var maxFeedItems = 15;
var req;
var buildPopupAfterResponse = false;
var OnFeedSuccess = null;
var OnFeedFail = null;
var retryMilliseconds = 120000;

var FEEDS = {
  "HN": "https://news.ycombinator.com/rss",
  "LWN": "https://lwn.net/headlines/rss"
};

function SetInitialOption(key, value) {
  if (localStorage[key] === undefined || localStorage[key] === null) {
    localStorage[key] = value;
  }
}

function UpdateIfReady(feedKey, force) {
  var lastRefresh = parseFloat(localStorage[feedKey + ".LastRefresh"]);
  var interval = parseFloat(localStorage[feedKey + ".RequestInterval"]);
  var nextRefresh = lastRefresh + interval;
  var curTime = parseFloat((new Date()).getTime());
  var isReady = (curTime > nextRefresh);
  if ((force == true) || isNaN(lastRefresh)) {
    UpdateFeed(feedKey);
  }
  else {
    if (isReady) {
      UpdateFeed(feedKey);
    }
  }
}

function UpdateFeed(feedKey) {
  var xhr = new XMLHttpRequest();
  var url = FEEDS[feedKey];
  if (!url) return;

  xhr.open('GET', url);
  xhr.onload = function () {
    if (xhr.status === 200) {
      onRssSuccess(feedKey, xhr.responseText);
    }
    else {
      onRssError(feedKey);
    }
  };
  xhr.send();
}

function onRssSuccess(feedKey, doc) {
  if (!doc) {
    handleFeedParsingFailed(feedKey, "Not a valid feed.");
    return;
  }
  var links = parseFeedLinks(doc);
  SaveLinksToLocalStorage(feedKey, links);
  if (buildPopupAfterResponse == true) {
    buildPopup(links);
    buildPopupAfterResponse = false;
  }
  localStorage[feedKey + ".LastRefresh"] = (new Date()).getTime();
}

function updateLastRefreshTime(feedKey) {
  localStorage[feedKey + ".LastRefresh"] = (new Date()).getTime();
}

function onRssError(feedKey, xhr, type, error) {
  handleFeedParsingFailed(feedKey, 'Failed to fetch RSS feed.');
}

function handleFeedParsingFailed(feedKey, error) {
  var lastRefresh = parseFloat(localStorage[feedKey + ".LastRefresh"]) || (new Date()).getTime();
  localStorage[feedKey + ".LastRefresh"] = lastRefresh + retryMilliseconds;
}

function parseXml(xml) {
  var xmlDoc;
  try {
    xmlDoc = new ActiveXObject('Microsoft.XMLDOM');
    xmlDoc.async = false;
    xmlDoc.loadXML(xml);
  }
  catch (e) {
    xmlDoc = (new DOMParser).parseFromString(xml, 'text/xml');
  }

  return xmlDoc;
}

function parseFeedLinks(rawXmlStr) {
  var parser = new DOMParser();
  var doc = parser.parseFromString(rawXmlStr, "text/xml");
  var entries = doc.getElementsByTagName('entry');
  if (entries.length == 0) {
    entries = doc.getElementsByTagName('item');
  }
  var count = Math.min(entries.length, maxFeedItems);
  var links = new Array();
  for (var i = 0; i < count; i++) {
    var item = entries.item(i);
    var feedLink = new Object();
    //Grab the title
    var itemTitle = item.getElementsByTagName('title')[0];
    if (itemTitle) {
      feedLink.Title = itemTitle.textContent;
    } else {
      feedLink.Title = "Unknown Title";
    }

    //Grab the Link
    var itemLink = item.getElementsByTagName('link')[0];
    if (!itemLink || !itemLink.textContent) {
      // Check for attribute link if textContent is empty (Atom format)
      if (itemLink && itemLink.getAttribute('href')) {
        feedLink.Link = itemLink.getAttribute('href');
      } else {
        itemLink = item.getElementsByTagName('comments')[0];
        if (itemLink) {
          feedLink.Link = itemLink.textContent;
        } else {
          feedLink.Link = '';
        }
      }
    } else {
      feedLink.Link = itemLink.textContent;
    }

    //Grab the comments link
    var commentsLink = item.getElementsByTagName('comments')[0];
    if (commentsLink) {
      feedLink.CommentsLink = commentsLink.textContent;
    } else {
      feedLink.CommentsLink = '';
    }

    links.push(feedLink);
  }
  return links;
}

function SaveLinksToLocalStorage(feedKey, links) {
  localStorage[feedKey + ".NumLinks"] = links.length;
  for (var i = 0; i < links.length; i++) {
    localStorage[feedKey + ".Link" + i] = JSON.stringify(links[i]);
  }
}

function RetrieveLinksFromLocalStorage(feedKey) {
  var numLinks = localStorage[feedKey + ".NumLinks"];
  if (numLinks === undefined || numLinks === null) {
    return null;
  }
  else {
    var links = new Array();
    for (var i = 0; i < numLinks; i++) {
      links.push(JSON.parse(localStorage[feedKey + ".Link" + i]))
    }
    return links;
  }
}



function openLink(e) {
  e.preventDefault();
  openUrl(this.href, (localStorage['HN.BackgroundTabs'] == 'false'));
}

function openLinkFront(e) {
  e.preventDefault();
  openUrl(this.href, true);
}

function printTime(d) {
  var hour = d.getHours();
  var minute = d.getMinutes();
  var ap = "AM";
  if (hour > 11) { ap = "PM"; }
  if (hour > 12) { hour = hour - 12; }
  if (hour == 0) { hour = 12; }
  if (minute < 10) { minute = "0" + minute; }
  var timeString = hour +
    ':' +
    minute +
    " " +
    ap;
  return timeString;
}

// Show |url| in a new tab.
function openUrl(url, take_focus) {
  // Only allow http and https URLs.
  if (url.indexOf("http:") != 0 && url.indexOf("https:") != 0) {
    return;
  }
  (typeof browser !== "undefined" ? browser : chrome).tabs.create({ url: url, active: take_focus });
}

function hideElement(id) {
  var e = document.getElementById(id);
  e.style.display = 'none';
}

function showElement(id) {
  var e = document.getElementById(id);
  e.style.display = 'block';
}

function toggle(id) {
  var e = document.getElementById(id);
  if (e.style.display == 'block')
    e.style.display = 'none';
  else
    e.style.display = 'block';
}
