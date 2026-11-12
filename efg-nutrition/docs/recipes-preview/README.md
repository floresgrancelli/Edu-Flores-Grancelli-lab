# Mis recetas — visual reference and isolated preview

Edu approved `approved-reference.png` on 11 November 2026 (Argentina): “Todo si, mantengamos esa misma foto como espejo”. This exact original is the visual reference. The production baseline is PR93, cf17a4784ffd1930fbf89b49d72afa3cbefd97ab. Mi Día remains unchanged.

Scope: Biblioteca/Mis recetas tabs, category selector, compact cards, one in-app recipe registration sheet. Existing calculations, ingredient access, journal save callbacks, private recipes and persistence guards remain. Creating a new personal recipe continues to use its existing workflow; this change concerns browsing and registration.

The browser test runs the entire PWA against loopback synthetic data. It checks fractional portions, schedule context, cancel/reopen drafts, exactly one write, rejected-write rollback/retry, student ingredient restrictions and professional personal diaries at 390/320px in Chromium and WebKit. Reduced viewport height is an emulation, not a physical keyboard/device test.

The three JPEGs are exact downloaded copies of the existing public library photos, served in the isolated test to avoid flaky external image requests. Production keeps its existing URLs and attribution:
- `budin-whey.jpg`: Cody Chan / Unsplash, https://unsplash.com/photos/a0fBbS8RZAo, photo-1632931057819-4eefffa8e007.
- `pancakes.jpg`: Brenda Godinez / Unsplash, https://unsplash.com/photos/pancakes-with-syrup-on-white-plate--KlkI_4N52I, photo-1504854991036-ca1b54063e48.
- `bowl.jpg`: Chee Kee / Unsplash, https://unsplash.com/photos/-X4tkvjVSco, photo-1744444202869-54debf97b285.

Before publication: inspect actual browser captures against the reference and get Edu's approval of the actual UI. Keep all required workflows. This document does not authorize deployment by itself.
