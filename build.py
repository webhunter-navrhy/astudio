#!/usr/bin/env python3
"""A Studio — sestaví statický web ze šablon (src/) a dat (content/*.json).
Obsah (lekce, rozvrh, ceník, lektorky, FAQ, kontakty) se upravuje v content/ — ručně nebo přes CMS v /admin."""
import hashlib, json, pathlib, re, shutil
from jinja2 import Environment, FileSystemLoader

ROOT = pathlib.Path(__file__).parent
SRC, CONTENT, OUT = ROOT / 'src', ROOT / 'content', ROOT / 'site'

if OUT.exists():
    shutil.rmtree(OUT)
shutil.copytree(ROOT / 'assets', OUT / 'assets')
for f in ('style.css', 'main.js', 'favicon.svg'):
    shutil.copy(SRC / f, OUT / 'assets' / f)
if (ROOT / 'admin').exists():
    shutil.copytree(ROOT / 'admin', OUT / 'admin')

def svg_parts(name):
    s = (ROOT / 'brand' / f'{name}.svg').read_text()
    return {'vb': re.search(r'viewBox="([^"]+)"', s).group(1), 'body': s[s.index('<g'):s.rindex('</svg>')]}

h = lambda p: hashlib.md5((OUT / p).read_bytes()).hexdigest()[:8]
data = {k: json.loads((CONTENT / f'{k}.json').read_text()) for k in ('site', 'lessons', 'schedule', 'pricing', 'team', 'faq')}
common = dict(
    data,
    v={'css': h('assets/style.css'), 'js': h('assets/main.js'), 'fav': h('assets/favicon.svg')},
    logo={'a_studio': svg_parts('logo-a-studio'), 'full': svg_parts('logo-full'), 'mark': svg_parts('logo-mark')},
    nav=[('lekce', 'lekce/', 'Lekce'), ('rozvrh', 'rozvrh/', 'Rozvrh'), ('cenik', 'cenik/', 'Ceník'),
         ('onas', 'o-nas/', 'O studiu'), ('lektorky', 'lektorky/', 'Lektorky'),
         ('prvni', 'prvni-navsteva/', 'První návštěva'), ('kontakt', 'kontakt/', 'Kontakt')],
)
env = Environment(loader=FileSystemLoader([str(SRC), str(SRC / 'pages')]), autoescape=False)
env.filters['img'] = lambda p: str(p).rsplit('/', 1)[-1]  # CMS ukládá /assets/img/x.jpg, šablony chtějí x.jpg
for page in sorted((SRC / 'pages').glob('*.html')):
    meta = json.loads(re.match(r'\{#\s*(\{.*?\})\s*#\}', page.read_text(), re.S).group(1))
    depth = meta['out'].count('/')
    html = env.get_template(page.name).render(
        common, root='../' * depth, page_id=meta['id'], page_title=meta['title'], page_desc=meta['desc'])
    out = OUT / meta['out']
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(html)
    print('✓', meta['out'])
