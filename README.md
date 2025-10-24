---

## GitHub Pages

- **URL:** https://codestar86.github.io/AB-Property-Inspections-Services/
- **Branch:** `main`
- **Workflow:** `.github/workflows/pages.yml`

**Build notes**
- `npm ci` when a `package-lock.json` exists; otherwise `npm install`.
- Build outputs to `dist/` and is deployed automatically.
- Vite `base` is set to `'/AB-Property-Inspections-Services/'` for asset paths.