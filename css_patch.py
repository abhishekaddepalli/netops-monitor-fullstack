css = """
/* Mobile Topbar Single Row Fix */
@media (max-width: 768px) {
  .topbar { 
    flex-wrap: nowrap !important; 
    gap: 8px !important;
  }
  .page-title { 
    display: none !important; 
  }
  .search-box { 
    order: 0 !important; 
    min-width: 0 !important; 
    width: 100% !important; 
    margin-top: 0 !important; 
    flex: 1 !important; 
  }
}
"""
with open('frontend/src/styles/app.css', 'a') as f:
    f.write(css)
