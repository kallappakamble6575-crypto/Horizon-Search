const form = document.querySelector("#search-form");
const input = document.querySelector("#query");

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const query = input.value.trim();
  if (!query) {
    input.focus();
    return;
  }
  window.location.assign(`/results?q=${encodeURIComponent(query)}&type=all`);
});
