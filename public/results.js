const TYPES = new Set(["all", "images", "videos", "maps", "shopping", "news"]);
const BRAVE_TYPES = new Set(["all", "images", "videos", "news"]);
const MAX_SEARCH_PAGES = 10;
const MAX_IMAGE_PAGES = 20;

const form = document.querySelector("#results-search-form");
const input = document.querySelector("#results-query");
const button = form.querySelector("button");
const status = document.querySelector("#status");
const results = document.querySelector("#results");
const pagination = document.querySelector("#pagination");
const tabs = [...document.querySelectorAll(".result-tabs a")];
let currentQuery = "";
let currentType = "all";
let latestRequest = 0;

function showStatus(message, kind = "info") {
  status.textContent = message;
  status.dataset.kind = kind;
}

function updateLocation(query, type, page = 1, replace = false) {
  const params = new URLSearchParams({ q: query, type });
  if (page > 1) params.set("page", String(page));
  const nextUrl = `/results?${params}`;
  if (nextUrl !== `${location.pathname}${location.search}`) {
    history[replace ? "replaceState" : "pushState"](null, "", nextUrl);
  }
}

function setActiveTab(type) {
  for (const tab of tabs) {
    if (tab.dataset.type === type) tab.setAttribute("aria-current", "page");
    else tab.removeAttribute("aria-current");
  }
}

function addPageButton(page, label = String(page), current = false, disabled = false) {
  const pageButton = document.createElement("button");
  pageButton.type = "button";
  pageButton.dataset.page = String(page);
  pageButton.textContent = label;
  pageButton.setAttribute(
    "aria-label",
    label === "‹" ? "Previous page" : label === "›" ? "Next page" : `Page ${page}`,
  );
  pageButton.disabled = disabled;
  if (current) pageButton.setAttribute("aria-current", "page");
  pagination.append(pageButton);
}

function renderPagination(page, hasNext, maxPages) {
  pagination.replaceChildren();
  const lastPage = hasNext ? maxPages : page;
  if (lastPage <= 1) {
    pagination.hidden = true;
    return;
  }

  pagination.hidden = false;
  addPageButton(Math.max(1, page - 1), "‹", false, page === 1);
  addPageButton(1, "1", page === 1);

  const firstVisiblePage = page > 5 ? Math.max(2, page - 2) : 2;
  const lastVisiblePage = Math.min(lastPage - 1, page > 5 ? page + 2 : 5);
  if (firstVisiblePage > 2) {
    const ellipsis = document.createElement("span");
    ellipsis.className = "pagination-ellipsis";
    ellipsis.textContent = "…";
    pagination.append(ellipsis);
  }
  for (let visiblePage = firstVisiblePage; visiblePage <= lastVisiblePage; visiblePage += 1) {
    addPageButton(visiblePage, String(visiblePage), visiblePage === page);
  }
  if (lastVisiblePage < lastPage - 1) {
    const ellipsis = document.createElement("span");
    ellipsis.className = "pagination-ellipsis";
    ellipsis.textContent = "…";
    pagination.append(ellipsis);
  }
  if (lastPage > 1) addPageButton(lastPage, String(lastPage), page === lastPage);
  addPageButton(Math.min(lastPage, page + 1), "›", false, !hasNext);
}

function makeResultCard(result, type) {
  const item = document.createElement("li");
  const card = document.createElement("article");
  card.className = type === "images" ? "result-card image-result-card" : "result-card";

  if (result.imageUrl) {
    const image = document.createElement("img");
    image.className = "result-thumbnail";
    image.src = result.imageUrl;
    image.alt = result.title;
    image.loading = "lazy";
    card.append(image);
  }

  const source = document.createElement("div");
  source.className = "result-source";
  source.textContent = result.breadcrumb
    ? `${result.hostname} › ${result.breadcrumb}`
    : result.hostname;

  const title = document.createElement("a");
  title.className = "result-title";
  title.href = result.url;
  title.target = "_blank";
  title.rel = "noopener noreferrer";
  title.textContent = result.title;

  const description = document.createElement("p");
  description.className = "result-description";
  description.textContent = result.description;

  card.append(source, title, description);
  item.append(card);
  return item;
}

function makeExternalCard(type, query) {
  const destinations = {
    maps: {
      label: "Google Maps",
      description: "Open this search in Google Maps to explore places and directions.",
      url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`,
    },
    shopping: {
      label: "Google Shopping",
      description: "Open this search in Google Shopping to browse products and prices.",
      url: `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(query)}`,
    },
  };
  const destination = destinations[type];
  const item = document.createElement("li");
  const card = document.createElement("article");
  card.className = "result-card external-result-card";

  const title = document.createElement("h2");
  title.className = "result-title";
  title.textContent = destination.label;

  const description = document.createElement("p");
  description.className = "result-description";
  description.textContent = destination.description;

  const link = document.createElement("a");
  link.className = "search-button external-search-link";
  link.href = destination.url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = `Continue to ${destination.label} →`;

  card.append(title, description, link);
  item.append(card);
  return item;
}

function showExternalMode(type, query) {
  pagination.hidden = true;
  pagination.replaceChildren();
  results.replaceChildren(makeExternalCard(type, query));
  showStatus(`${type === "maps" ? "Map" : "Shopping"} search is ready.`);
}

async function search(query, type, page = 1, replaceHistory = false) {
  const requestId = ++latestRequest;
  currentQuery = query;
  currentType = type;
  input.value = query;
  setActiveTab(type);
  updateLocation(query, type, page, replaceHistory);
  results.replaceChildren();
  pagination.replaceChildren();
  pagination.hidden = true;

  if (!BRAVE_TYPES.has(type)) {
    button.disabled = false;
    showExternalMode(type, query);
    return;
  }

  button.disabled = true;
  showStatus(`Searching Brave ${type === "all" ? "web" : type} results…`);

  try {
    const response = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, page, type }),
    });
    const payload = await response.json();
    if (requestId !== latestRequest) return;

    if (!response.ok) {
      showStatus(payload.error || "Search could not be completed.", "error");
      return;
    }

    if (!payload.results.length) {
      showStatus(`No ${type === "all" ? "web " : ""}results found. Try a broader search.`);
      return;
    }

    results.replaceChildren(...payload.results.map((result) => makeResultCard(result, type)));
    showStatus(`${payload.results.length} ${type === "all" ? "web " : ""}results · ${payload.provider} · page ${page}`);
    renderPagination(
      page,
      payload.hasNext,
      type === "images" ? MAX_IMAGE_PAGES : MAX_SEARCH_PAGES,
    );
  } catch {
    if (requestId === latestRequest) {
      showStatus("Could not reach Horizon Search. Check that the local server is running.", "error");
    }
  } finally {
    if (requestId === latestRequest) button.disabled = false;
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const query = input.value.trim();
  if (query) void search(query, currentType, 1);
});

for (const tab of tabs) {
  tab.addEventListener("click", (event) => {
    event.preventDefault();
    if (currentQuery) void search(currentQuery, tab.dataset.type, 1);
  });
}

pagination.addEventListener("click", (event) => {
  const pageButton = event.target.closest("button[data-page]");
  if (!pageButton || pageButton.disabled || !currentQuery || !BRAVE_TYPES.has(currentType)) return;
  const page = Number(pageButton.dataset.page);
  const maxPages = currentType === "images" ? MAX_IMAGE_PAGES : MAX_SEARCH_PAGES;
  if (Number.isInteger(page) && page >= 1 && page <= maxPages) {
    void search(currentQuery, currentType, page);
  }
});

window.addEventListener("popstate", () => {
  const params = new URLSearchParams(location.search);
  const query = params.get("q")?.trim() || "";
  const type = TYPES.has(params.get("type")) ? params.get("type") : "all";
  const page = Number(params.get("page") || 1);
  const maxPages = type === "images" ? MAX_IMAGE_PAGES : MAX_SEARCH_PAGES;
  if (query) {
    void search(
      query,
      type,
      Number.isInteger(page) && page > 0 && page <= maxPages ? page : 1,
      true,
    );
  }
});

const initialParams = new URLSearchParams(location.search);
const initialQuery = initialParams.get("q")?.trim() || "";
const initialType = TYPES.has(initialParams.get("type")) ? initialParams.get("type") : "all";
const initialPage = Number(initialParams.get("page") || 1);
const initialMaxPages = initialType === "images" ? MAX_IMAGE_PAGES : MAX_SEARCH_PAGES;

if (initialQuery) {
  void search(
    initialQuery,
    initialType,
    Number.isInteger(initialPage) && initialPage > 0 && initialPage <= initialMaxPages
      ? initialPage
      : 1,
  );
} else {
  showStatus("Enter a query to search.");
  input.focus();
}
