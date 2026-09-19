"""Generate a local-only browser smoke page with synthetic geometry, no live API or storage writes."""
from pathlib import Path
root=Path(__file__).resolve().parent.parent
html=(root/'index.html').read_text().replace('<head>','<head><base href="../">')
html=html.replace('<script defer src="app.js"></script>','<script defer src="tests/fixture.js"></script><script defer src="app.js"></script>')
(root/'tests/smoke.html').write_text(html)
