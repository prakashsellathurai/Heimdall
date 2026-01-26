var currentDashboardFeed = null;

window.onload = function () {
    initDashboard();
};

function initDashboard() {
    renderSidebarFeeds();
    setupDashboardEvents();
    var lastView = localStorage["Heimdall.LastDashboardView"] || 'home';
    var lastFeed = localStorage["Heimdall.LastDashboardFeed"];
    showView(lastView, lastFeed);
}

function setupDashboardEvents() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function () {
            var view = this.getAttribute('data-view');
            if (view) {
                showView(view);
            }
        });
    });

    document.getElementById('add-feed-btn').addEventListener('click', handleAddFeedDashboard);
    setupPreviewEvents();
}

function setupPreviewEvents() {
    document.getElementById('close-preview-btn').onclick = closePreview;
}

function showView(viewId, feedKey) {
    // Update active state in sidebar
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-view') === viewId && (!feedKey || item.getAttribute('data-feed') === feedKey)) {
            item.classList.add('active');
        }
    });

    localStorage["Heimdall.LastDashboardView"] = viewId;
    if (feedKey) {
        localStorage["Heimdall.LastDashboardFeed"] = feedKey;
    } else {
        localStorage.removeItem("Heimdall.LastDashboardFeed");
    }

    // Hide all views
    document.getElementById('view-home').style.display = 'none';
    document.getElementById('view-feed').style.display = 'none';
    document.getElementById('view-settings').style.display = 'none';

    // Show selected view
    document.getElementById('view-' + viewId).style.display = 'block';

    if (viewId === 'home') {
        renderHomeFeed();
    } else if (viewId === 'feed') {
        renderIndividualFeed(feedKey);
    } else if (viewId === 'settings') {
        renderSettings();
    }
}

function renderSidebarFeeds() {
    var feeds = LoadFeeds();
    var container = document.getElementById('sidebar-feeds');
    container.innerHTML = '';

    for (var key in feeds) {
        if (feeds.hasOwnProperty(key)) {
            var item = document.createElement('div');
            item.className = 'nav-item';
            item.setAttribute('data-view', 'feed');
            item.setAttribute('data-feed', key);
            item.textContent = key;
            item.onclick = (function (k) {
                return function () { showView('feed', k); };
            })(key);
            container.appendChild(item);
        }
    }
}

function renderArticle(item, id) {
    var card = document.createElement('div');
    card.className = 'article-card';

    var title = document.createElement('a');
    title.className = 'article-title';
    title.href = item.Link;
    title.textContent = id + ". " + item.Title;
    title.onclick = function (e) {
        e.preventDefault();
        openInPreview(item.Link);
    };
    card.appendChild(title);

    if (item.CommentsLink) {
        var meta = document.createElement('a');
        meta.className = 'article-meta';
        meta.href = item.CommentsLink;
        meta.textContent = "  |  (comments)";
        meta.onclick = function (e) {
            e.preventDefault();
            e.stopPropagation();
            openInPreview(item.CommentsLink);
        };
        card.appendChild(meta);
    }
    return card;
}

function openInPreview(url) {
    var panel = document.getElementById('preview-panel');
    var frame = document.getElementById('preview-frame');
    var urlDisplay = document.getElementById('preview-url');

    frame.src = url;
    urlDisplay.textContent = url;
    panel.classList.add('open');
}

function closePreview() {
    var panel = document.getElementById('preview-panel');
    var frame = document.getElementById('preview-frame');
    panel.classList.remove('open');
    setTimeout(() => {
        frame.src = 'about:blank';
    }, 300);
}

function renderHomeFeed() {
    var container = document.getElementById('home-articles');
    container.innerHTML = 'Loading mixed feed...';

    GetMixedFeed(function (links) {
        container.innerHTML = '';
        if (links.length === 0) {
            container.innerHTML = 'No articles found. Add some feeds in Settings!';
            return;
        }
        var id = 1;
        links.forEach(link => {
            container.appendChild(renderArticle(link, id++));
        });
    });
}

function renderIndividualFeed(feedKey) {
    var container = document.getElementById('feed-articles');
    var title = document.getElementById('feed-title');
    title.textContent = feedKey;
    container.innerHTML = 'Loading articles...';

    UpdateFeed(feedKey, function (links) {
        container.innerHTML = '';
        if (!links || links.length === 0) {
            container.innerHTML = 'No articles found in this feed.';
            return;
        }
        var id = 1;
        links.forEach(link => {
            container.appendChild(renderArticle(link, id++));
        });
    });
}

function renderSettings() {
    var feeds = LoadFeeds();
    var container = document.getElementById('manage-feeds-list');
    container.innerHTML = '';

    for (var key in feeds) {
        if (feeds.hasOwnProperty(key)) {
            var item = document.createElement('div');
            item.className = 'feed-management-item';

            var info = document.createElement('div');
            info.innerHTML = `<strong>${key}</strong><br><small>${feeds[key]}</small>`;

            var removeBtn = document.createElement('button');
            removeBtn.className = 'btn btn-danger';
            removeBtn.textContent = 'Unsubscribe';
            removeBtn.onclick = (function (k) {
                return function () {
                    if (confirm('Unsubscribe from ' + k + '?')) {
                        RemoveFeed(k);
                        renderSidebarFeeds();
                        renderSettings();
                    }
                };
            })(key);

            item.appendChild(info);
            item.appendChild(removeBtn);
            container.appendChild(item);
        }
    }
}

function handleAddFeedDashboard() {
    var name = document.getElementById('new-feed-name').value.trim();
    var url = document.getElementById('new-feed-url').value.trim();

    if (!name || !url) {
        alert('Please fill in both fields');
        return;
    }

    AddFeed(name, url);
    document.getElementById('new-feed-name').value = '';
    document.getElementById('new-feed-url').value = '';
    renderSidebarFeeds();
    renderSettings();
    alert('Feed added successfully!');
}
