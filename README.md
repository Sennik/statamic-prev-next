# Statamic Prev / Next

Adds previous / next navigation buttons and a position counter to the entry
edit toolbar in the Statamic 6 control panel. Designed for editors who work
through long collections (news posts, products, training entries, etc.) and
want to jump from one entry to the next without bouncing back to the listing
screen.

```
  ←   12 of 47   →
```

## Features

- Prev / next buttons + "X of Y" counter injected into the entry edit toolbar.
- Honours each collection's own ordering:
  - **Structured collections** (pages with parent/child) use the flattened tree
    order, just like the listing screen.
  - **Flat collections** use the collection's configured `sort_field` and
    `sort_dir`.
- Multisite aware: neighbours are resolved within the entry's own locale.
- SPA-friendly navigation: uses Statamic's Inertia router when available so
  the page transition is instant; falls back to a full reload on older
  installations.
- Hover tooltips show the title of the previous / next entry, plus disabled
  state at the start / end of the list.
- Fully translatable (English and Dutch included).
- Zero configuration — install and it works.

## Requirements

- PHP 8.2+
- Statamic 6.x
- A Statamic CP session (the addon only runs inside the control panel)

## Installation

```bash
composer require sennik/statamic-prev-next
```

The addon registers itself through Laravel package discovery. No further
setup is needed.

## How it works

1. A small JavaScript file is appended to every CP page.
2. When you open `/cp/collections/{collection}/entries/{entry}`, the script
   detects the route, looks up the toolbar in the page header, and injects a
   pill with two chevron buttons and a counter.
3. The buttons call a CP endpoint that resolves the neighbouring entries:

   ```
   GET /cp/prev-next/{collection}/{entry}

   {
     "prev":     { "id": "…", "title": "…", "edit_url": "…" } | null,
     "next":     { "id": "…", "title": "…", "edit_url": "…" } | null,
     "position": 12,
     "total":    47
   }
   ```
4. Clicking a button navigates to the neighbour's edit URL via Inertia (SPA),
   or with a regular page load if Inertia is not exposed.

The script uses a `MutationObserver` so the buttons are reinjected
automatically when you navigate between entries inside the SPA, and a short
polling fallback covers slow initial loads.

## Translations

The bundled language file contains five strings:

| Key            | English                  |
|----------------|--------------------------|
| `previous`     | Previous                 |
| `next`         | Next                     |
| `position`     | :current of :total       |
| `no_previous`  | No previous entry        |
| `no_next`      | No next entry            |

To override them, publish the language files:

```bash
php artisan vendor:publish --tag=sennik-prev-next-lang
```

This copies them to `lang/vendor/sennik-prev-next/{locale}/strings.php`,
where you can edit or add additional locales.

## Permissions

The endpoint runs inside the CP route group, so it requires the standard
Statamic CP authentication. It returns no data that an editor would not
already be allowed to see, and does not expose entries from collections the
user cannot access (the controller resolves entries by id; entries from
restricted collections still appear in navigation only if Statamic itself
exposes them in the edit URL).

## Troubleshooting

**The buttons do not appear.**
Make sure you are on an entry edit page (`/cp/collections/.../entries/...`)
and that JavaScript loads from `/vendor/statamic-prev-next/js/`. Open the
browser dev tools console — the addon logs `[prev-next]` messages while
mounting.

**Buttons appear but jumping does a full page reload.**
This happens when the Inertia router is not exposed on the page. Functionally
identical; only slightly slower. Verify that your Statamic install is
up-to-date.

**Counter shows `0` or "No previous entry" everywhere.**
The current entry could not be located inside the collection's ordering.
Most often this is a multisite issue: the entry exists in another locale than
the one you are editing. The resolver only searches within the entry's own
locale.

## License

MIT — see [composer.json](composer.json).

## Credits

Built by [Sennik](https://github.com/Sennik).
