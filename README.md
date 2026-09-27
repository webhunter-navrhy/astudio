# A Studio — web

Boutique studio Barre & Pilates, Odolena Voda. Statický web generovaný z dat.

## Jak web funguje
- **Obsah** je v `_data/*.json` — kontakty, lekce, rozvrh, ceník, lektorky, FAQ.
- **Šablony** v `src/` (Jinja), styly `src/style.css`, skripty `src/main.js`.
- `python3 build.py` → hotový web do `site/` (s `?v=` hashi proti cache, `version.json`).
- Každý push do `main` web sestaví a nasadí GitHub Actions (`.github/workflows/deploy.yml`).

## Administrace pro klientku — `/admin/`
- Přihlášení **jen heslem** (výchozí `admin`, klientka si ho změní v sekci „Heslo a odhlášení“).
- Backend: společný Cloudflare Worker `~/webhunter-admin` (web id `astudio`). Worker ověří heslo
  a uloží změny jedním commitem do tohoto repa → Action web přegeneruje (~1 min).
- Upravit lze: kontakty a odkaz na rezervace, lekce (texty + fotky), rozvrh, ceník, příběh
  a kvalifikace, lektorky, FAQ. Nahrané fotky jdou do `img/uploads/`.
- Reset hesla na „admin“: viz README v `~/webhunter-admin`.

## Rezervační systém
- `_data/site.json → booking_url` — kam vedou všechna tlačítka „Rezervovat“.
- `booking_embed` — URL widgetu; když je vyplněná, na stránce Rozvrh se vloží přímo do webu (iframe).

## Podklady
- Logo převedené do vektoru z dodaného PNG (`brand/`), stíny listů z vizualizace výlohy.
- Fotky lekcí: Unsplash (zdroje v `assets/img/credits.json`) — nahradit profesionálními fotkami studia.
