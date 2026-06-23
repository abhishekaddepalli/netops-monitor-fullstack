import re

with open('frontend/src/styles/tokens.css', 'r') as f:
    tokens = f.read()

root_vars = """
  --glass-bg: rgba(15, 32, 54, 0.65);
  --glass-panel-bg: rgba(15, 32, 54, 0.4);
  --glass-border: rgba(255, 255, 255, 0.08);
  --glass-shadow: rgba(0, 0, 0, 0.3);
  --topbar-bg: rgba(11, 25, 41, 0.8);
  --sidebar-bg: rgba(15, 32, 54, 0.95);
  --dropdown-bg: rgba(15, 32, 54, 0.85);
"""
light_vars = """
  --glass-bg: rgba(243, 244, 246, 0.65);
  --glass-panel-bg: rgba(255, 255, 255, 0.4);
  --glass-border: rgba(0, 0, 0, 0.08);
  --glass-shadow: rgba(0, 0, 0, 0.1);
  --topbar-bg: rgba(255, 255, 255, 0.8);
  --sidebar-bg: rgba(249, 250, 251, 0.95);
  --dropdown-bg: rgba(255, 255, 255, 0.85);
"""

tokens = re.sub(r'(:root\s*\{)(.*?)(\})', lambda m: m.group(1) + m.group(2) + root_vars + m.group(3), tokens, flags=re.DOTALL)
tokens = re.sub(r'(\[data-theme="light"\]\s*\{)(.*?)(\})', lambda m: m.group(1) + m.group(2) + light_vars + m.group(3), tokens, flags=re.DOTALL)

with open('frontend/src/styles/tokens.css', 'w') as f:
    f.write(tokens)

with open('frontend/src/styles/app.css', 'r') as f:
    app_css = f.read()

app_css = re.sub(r'\.glass\s*\{.*?\}', '.glass { background: var(--glass-bg) !important; backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid var(--glass-border); }', app_css, flags=re.DOTALL)
app_css = re.sub(r'\.glass-panel\s*\{.*?\}', '.glass-panel { background: var(--glass-panel-bg) !important; backdrop-filter: blur(24px); border: 1px solid var(--glass-border); box-shadow: 0 8px 32px var(--glass-shadow); }', app_css, flags=re.DOTALL)
app_css = re.sub(r'\.topbar\s*\{.*?\}', '.topbar { background: var(--topbar-bg) !important; backdrop-filter: blur(12px); border-bottom: 1px solid var(--glass-border); }', app_css, flags=re.DOTALL)

# Re-write the recently added .sidebar glass rule, while preserving the layout rule
app_css = re.sub(r'\.sidebar\s*\{\s*background:\s*rgba.*?\n?.*?\}', '.sidebar { background: var(--sidebar-bg) !important; backdrop-filter: blur(20px); }', app_css, flags=re.DOTALL)
app_css = re.sub(r'\.dropdown-menu\s*\{\s*background:\s*rgba.*?\n?.*?\}', '.dropdown-menu { background: var(--dropdown-bg) !important; backdrop-filter: blur(16px); border: 1px solid var(--glass-border); }', app_css, flags=re.DOTALL)

# Add sidebar-scrollarea if it doesn't exist
if '.sidebar-scrollarea' not in app_css:
    app_css += '\n.sidebar-scrollarea { flex: 1; overflow-y: auto; overflow-x: hidden; }\n.sidebar-scrollarea::-webkit-scrollbar { width: 4px; }\n.sidebar-scrollarea::-webkit-scrollbar-thumb { background: var(--navy-600); border-radius: 4px; }\n'

with open('frontend/src/styles/app.css', 'w') as f:
    f.write(app_css)
