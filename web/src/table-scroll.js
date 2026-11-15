/** Toggle scroll fade only when a table region actually overflows horizontally. */
export function updateTableScrollFades() {
  document.querySelectorAll(".table-scroll").forEach((el) => {
    const table = el.querySelector("table");
    const scrollW = table ? table.scrollWidth : el.scrollWidth;
    const overflows = scrollW > el.clientWidth + 1;
    el.classList.toggle("is-overflowing", overflows);
  });
}