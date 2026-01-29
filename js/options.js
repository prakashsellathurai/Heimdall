window.onload = function () {
    renderFeedList();
    document.getElementById('add-btn').addEventListener('click', handleAddFeed);
};

function renderFeedList() {
    var feeds = LoadFeeds();
    var list = document.getElementById('feed-list');
    list.innerHTML = '';

    for (var name in feeds) {
        if (feeds.hasOwnProperty(name)) {
            var item = document.createElement('div');
            item.className = 'feed-section';

            var feedHeader = document.createElement('div');
            feedHeader.className = 'feed-header';

            var info = document.createElement('div');
            info.className = 'feed-info';

            var nameSpan = document.createElement('span');
            nameSpan.className = 'feed-name';
            nameSpan.textContent = name;

            var urlSpan = document.createElement('span');
            urlSpan.className = 'feed-url';
            urlSpan.textContent = feeds[name];

            info.appendChild(nameSpan);
            info.appendChild(urlSpan);

            var controls = document.createElement('div');
            controls.className = 'feed-controls';

            var removeBtn = document.createElement('button');
            removeBtn.className = 'remove-btn';
            removeBtn.textContent = 'Remove';
            removeBtn.onclick = (function (n) {
                return function () {
                    if (confirm('Are you sure you want to remove ' + n + '?')) {
                        RemoveFeed(n);
                        renderFeedList();
                    }
                };
            })(name);

            controls.appendChild(removeBtn);
            feedHeader.appendChild(info);
            feedHeader.appendChild(controls);
            item.appendChild(feedHeader);

            // Container for feed items
            var itemsList = document.createElement('ul');
            itemsList.className = 'feed-items-list';
            itemsList.id = 'items-' + name;
            itemsList.innerHTML = '<li>Loading items...</li>';
            item.appendChild(itemsList);

            list.appendChild(item);

            // Fetch items
            (function (n) {
                UpdateFeed(n, function (links) {
                    var itemsUl = document.getElementById('items-' + n);
                    if (!itemsUl) return;
                    itemsUl.innerHTML = '';
                    if (!links || links.length === 0) {
                        itemsUl.innerHTML = '<li>No items found.</li>';
                        return;
                    }
                    var count = Math.min(links.length, 5);
                    for (var i = 0; i < count; i++) {
                        var li = document.createElement('li');
                        var a = document.createElement('a');
                        a.href = links[i].Link;
                        a.textContent = links[i].Title;
                        a.target = "_blank";
                        li.appendChild(a);
                        itemsUl.appendChild(li);
                    }
                });
            })(name);
        }
    }
}

function handleAddFeed() {
    var nameInput = document.getElementById('feed-name');
    var urlInput = document.getElementById('feed-url');

    var name = nameInput.value.trim();
    var url = urlInput.value.trim();

    if (!name || !url) {
        alert('Please provide both a name and a URL.');
        return;
    }

    if (url.indexOf("http") !== 0) {
        alert('URL must start with http or https.');
        return;
    }

    AddFeed(name, url);
    renderFeedList();

    nameInput.value = '';
    urlInput.value = '';
}

if (typeof module !== 'undefined') {
    module.exports = {
        renderFeedList,
        handleAddFeed
    };
}
