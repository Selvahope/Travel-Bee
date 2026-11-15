// admin-mobile.js — copies each table's column headings onto its cells (data-l), so the
// stacked-card layout on phones can show a label beside every value. Re-runs whenever
// admin.js refills a table body.
document.querySelectorAll('table.data-table').forEach(table => {
  const heads = [...table.querySelectorAll('thead th')].map(th => th.textContent.trim());
  const body = table.querySelector('tbody');
  if (!body) return;
  const label = () => body.querySelectorAll('tr').forEach(tr => {
    [...tr.children].forEach((td, i) => {
      if (td.colSpan > 1) return;
      if (heads[i] && td.dataset.l !== heads[i]) td.dataset.l = heads[i];
    });
  });
  new MutationObserver(label).observe(body, { childList: true });
  label();
});
