#!/usr/bin/env python3
"""A-Studio — sestaví statický web ze šablon (src/) a dat (_data/*.json) do site/.
Obsah (lekce, rozvrh, ceník, lektorky, FAQ, kontakty) se upravuje v administraci na /admin/
(backend: webhunter-admin na Cloudflare) nebo ručně v _data/."""
import hashlib, json, os, pathlib, re, shutil
from jinja2 import Environment, FileSystemLoader

ROOT = pathlib.Path(__file__).parent
SRC, CONTENT, OUT = ROOT / 'src', ROOT / '_data', ROOT / 'site'

if OUT.exists():
    shutil.rmtree(OUT)
shutil.copytree(ROOT / 'assets', OUT / 'assets')
for f in ('style.css', 'main.js', 'favicon.svg'):
    shutil.copy(SRC / f, OUT / 'assets' / f)
for f in (ROOT / 'brand').glob('logo-*.svg'):
    shutil.copy(f, OUT / 'assets' / f.name)
shutil.copytree(ROOT / 'img', OUT / 'img', ignore=shutil.ignore_patterns('.gitkeep'))  # fotky nahrané v administraci
shutil.copytree(ROOT / 'admin', OUT / 'admin')

def svg_parts(name):
    s = (ROOT / 'brand' / f'{name}.svg').read_text()
    return {'vb': re.search(r'viewBox="([^"]+)"', s).group(1), 'body': s[s.index('<g'):s.rindex('</svg>')]}

h = lambda p: hashlib.md5((OUT / p).read_bytes()).hexdigest()[:8]
data = {k: json.loads((CONTENT / f'{k}.json').read_text()) for k in ('site', 'lessons', 'schedule', 'pricing', 'team', 'faq', 'vop')}
common = dict(
    data,
    v={'css': h('assets/style.css'), 'js': h('assets/main.js'), 'fav': h('assets/favicon.svg')},
    logo={'a_studio': svg_parts('logo-a-studio'), 'full': svg_parts('logo-full'), 'mark': svg_parts('logo-mark')},
    nav=[('lekce', 'lekce/', 'Lekce'), ('rozvrh', 'rozvrh/', 'Rozvrh'), ('cenik', 'cenik/', 'Ceník'),
         ('onas', 'o-nas/', 'O studiu'), ('lektorky', 'lektorky/', 'Lektorky'),
         ('prvni', 'prvni-navsteva/', 'První návštěva'), ('kontakt', 'kontakt/', 'Kontakt')],
)
env = Environment(loader=FileSystemLoader([str(SRC), str(SRC / 'pages')]), autoescape=False)
# obrázek z dat → cesta od kořene webu: nahrané v administraci (img/uploads/…) nebo výchozí (assets/img/…)
env.filters['img'] = lambda p: str(p) if str(p).startswith('img/') else 'assets/img/' + str(p).rsplit('/', 1)[-1]
# víceřádkový text z administrace → odstavce
env.filters['paras'] = lambda t: ''.join(f'<p>{x.strip()}</p>' for x in str(t or '').split('\n') if x.strip())
# e-mailové adresy v textu → odkazy
env.filters['mailto'] = lambda t: re.sub(r'([\w.+-]+@[\w-]+(?:\.[\w-]+)+)', r'<a href="mailto:\1">\1</a>', str(t or ''))
# česká typografie: jednopísmenné předložky a spojky nenechávat na konci řádku (jen v textu, ne v tagách/skriptech)
_NB = re.compile(r'(?<![\w&;])([vszkouiaVSZKOUIA]) (?=\S)')
def nbsp(html):
    parts = re.split(r'(<script.*?</script>|<style.*?</style>|<svg.*?</svg>|<[^>]+>)', html, flags=re.S)
    return ''.join(x if i % 2 else _NB.sub(r'\1&nbsp;', x) for i, x in enumerate(parts))
for page in sorted((SRC / 'pages').glob('*.html')):
    meta = json.loads(re.match(r'\{#\s*(\{.*?\})\s*#\}', page.read_text(), re.S).group(1))
    depth = meta['out'].count('/')
    html = env.get_template(page.name).render(
        common, root='../' * depth, page_id=meta['id'], page_title=meta['title'], page_desc=meta['desc'])
    out = OUT / meta['out']
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(nbsp(html))
    print('✓', meta['out'])

# seznam obrázků pro výběr v administraci + verze pro hlídání zveřejnění
imgs = sorted('assets/img/' + f.name for f in (OUT / 'assets/img').glob('*.jpg') if not f.name.startswith(('og', 'apple')))
imgs += sorted(str(f.relative_to(OUT)) for f in (OUT / 'img').rglob('*') if f.is_file())
(OUT / 'admin/images.json').write_text(json.dumps(imgs, ensure_ascii=False))
(OUT / 'version.json').write_text(json.dumps({'sha': os.environ.get('GITHUB_SHA', 'local')}))
(OUT / '.nojekyll').touch()
ai = OUT / 'admin/index.html'
ai.write_text(ai.read_text().replace('__V_ACSS__', h('admin/admin.css')).replace('__V_AJS__', h('admin/admin.js')))
