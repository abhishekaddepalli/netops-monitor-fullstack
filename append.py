css = """
/* ApexCharts Light Mode Overrides */
.apexcharts-menu {
  background: var(--dropdown-bg) !important;
  border: 1px solid var(--glass-border) !important;
  color: var(--white-100) !important;
}
.apexcharts-theme-light .apexcharts-menu-icon svg {
  fill: var(--white-100) !important;
}
.apexcharts-theme-dark .apexcharts-menu-icon svg {
  fill: var(--white-100) !important;
}
.apexcharts-menu-item:hover {
  background: var(--navy-700) !important;
  color: #fff !important;
}

/* Mobile Topbar Fixes */
@media (max-width: 768px) {
  .topbar { flex-wrap: wrap; gap: 10px; padding: 12px 16px !important; }
  .search-box { order: 10; min-width: 100%; margin-left: 0 !important; margin-top: 5px; }
  .page-title { flex: 1; }
}
"""

with open('frontend/src/styles/app.css', 'a') as f:
    f.write(css)
