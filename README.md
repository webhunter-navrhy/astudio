# A Studio — web (návrh)

Boutique studio Barre & Pilates, Odolena Voda. Statický web generovaný z dat.

## Jak web funguje
- **Obsah** je v `content/*.json` — kontakty, lekce, rozvrh, ceník, lektorky, FAQ.
- **Šablony** v `src/` (Jinja), styly `src/style.css`, skripty `src/main.js`.
- `python3 build.py` → hotový web do `site/` (s `?v=` hashi proti cache).
- Při každém pushi do `main` web sestaví a nasadí GitHub Actions.

## Administrace pro klientku
- Adresa: **/admin** (Sveltia CMS). Přihlášení přes GitHub účet s přístupem k repozitáři
  (tlačítko „Sign in with GitHub“, nebo přihlášení tokenem).
- Upravit lze: kontakty, odkaz na rezervační systém, lekce (texty + fotky), rozvrh, ceník,
  příběh a kvalifikace, lektorky, FAQ. Po uložení se web sám přegeneruje (~1 min).

## Rezervační systém
- `content/site.json → booking_url` — kam vedou všechna tlačítka „Rezervovat“.
- `booking_embed` — URL widgetu; když je vyplněná, na stránce Rozvrh se vloží přímo do webu (iframe).

## Podklady
- Logo převedené do vektoru z dodaného PNG (`brand/`), stíny listů z vizualizace výlohy.
- Fotky lekcí: Unsplash (zdroje v `assets/img/credits.json`) — nahradit profesionálními fotkami studia.
