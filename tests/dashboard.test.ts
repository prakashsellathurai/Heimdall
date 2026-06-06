import "./setup";

describe("Dashboard Logic", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="sidebar-feeds"></div>
      <div id="view-home" style="display:none">
        <div id="home-articles"></div>
      </div>
      <div id="view-feed" style="display:none">
        <h2 id="feed-title"></h2>
        <div id="feed-articles"></div>
      </div>
      <div id="view-settings" style="display:none">
        <div id="manage-feeds-list"></div>
        <input id="new-feed-name" />
        <input id="new-feed-url" />
        <button id="add-feed-btn"></button>
      </div>
      <div id="preview-panel" class="">
        <button id="close-preview-btn"></button>
        <div id="preview-url"></div>
        <iframe id="preview-frame"></iframe>
      </div>
      <div class="nav-item" data-view="home">Home</div>
      <div class="nav-item" data-view="settings">Settings</div>
    `;
    localStorage.clear();
  });

  it("renderSidebarFeeds renders feed list", async () => {
    localStorage.setItem(
      "Heimdall.Feeds",
      JSON.stringify({ F1: "http://f1.com", F2: "http://f2.com" }),
    );
    const { clearFeedsCache } = await import("../src/core/storage");
    clearFeedsCache();

    const { renderSidebarFeeds } = await import("../src/dashboard/dashboard");
    renderSidebarFeeds();

    const items = document.querySelectorAll('.nav-item[data-view="feed"]');
    expect(items.length).toBe(2);
    expect(items[0].textContent).toBe("F1");
  });

  it("showView switches to settings view", async () => {
    const { showView } = await import("../src/dashboard/dashboard");
    showView("settings");

    expect(document.getElementById("view-home")?.style.display).toBe("none");
    expect(document.getElementById("view-settings")?.style.display).toBe(
      "block",
    );
  });

  it("renderArticle creates card with preview on click", async () => {
    const { renderArticle } = await import("../src/dashboard/dashboard");
    const item = {
      Title: "T",
      Link: "http://t.com",
      CommentsLink: "http://c.com",
    };
    const card = renderArticle(item, 1);

    expect(card.className).toBe("article-card");
    expect(card.innerHTML).toContain("(comments)");

    const link = card.querySelector(".article-title") as HTMLElement;
    link.click();

    const panel = document.getElementById("preview-panel");
    expect(panel?.classList.contains("open")).toBe(true);
    expect(document.getElementById("preview-url")?.textContent).toBe(
      "http://t.com",
    );
  });

  it("closePreview resets iframe", async () => {
    jest.useFakeTimers();
    const { openInPreview, closePreview } =
      await import("../src/dashboard/dashboard");

    openInPreview("http://test.com");
    closePreview();

    const panel = document.getElementById("preview-panel");
    expect(panel?.classList.contains("open")).toBe(false);

    jest.runAllTimers();
    const frame = document.getElementById("preview-frame") as HTMLIFrameElement;
    expect(frame?.src).toBe("about:blank");
    jest.useRealTimers();
  });

  it("renderSettings shows feeds with unsubscribe buttons", async () => {
    localStorage.setItem(
      "Heimdall.Feeds",
      JSON.stringify({ F1: "http://f1.com", F2: "http://f2.com" }),
    );
    const { clearFeedsCache } = await import("../src/core/storage");
    clearFeedsCache();

    const { renderSettings } = await import("../src/dashboard/dashboard");
    renderSettings();

    const btns = document.querySelectorAll(".btn-danger");
    expect(btns.length).toBe(2);
  });

  it("handleAddFeedDashboard shows toast on invalid input", async () => {
    const { handleAddFeedDashboard } =
      await import("../src/dashboard/dashboard");
    handleAddFeedDashboard();

    const toast = document.getElementById("heimdall-toast");
    expect(toast?.textContent).toContain("Please fill in both fields");
  });
});
