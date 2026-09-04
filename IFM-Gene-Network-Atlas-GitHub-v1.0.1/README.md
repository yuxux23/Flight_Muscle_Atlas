# IFM Gene Network Atlas

Explore Drosophila indirect flight muscle gene networks across D0, D25, and
D50 using GNN, hdWGCNA, and SCENIC results. This repository includes a prebuilt
GitHub Pages website and its editable React source. Visitors need only a web
browser; no account, Node.js installation, or database is required.

## Publish using the GitHub website

1. Unzip the delivery archive on your computer.
2. Create a GitHub repository, for example `ifm-gene-network-atlas`. Choose
   **Public** if using GitHub Free. Select **Add a README file** to initialize
   its `main` branch.
3. On the repository's **Code** page, choose **Add file → Upload files**.
   Drag the **contents** of the extracted folder into the upload area and
   commit the upload to `main`. Upload the folders, not the ZIP file and not
   the outer `IFM-Gene-Network-Atlas-GitHub-…` folder.
4. Check that the repository contains `docs/index.html`, `docs/assets/`, and
   `docs/data/`. The `docs` folder must be directly in the repository root.
5. Open **Settings → Pages**. Under **Build and deployment**, select
   **Deploy from a branch**, choose **main** and **/docs**, then **Save**.
6. Wait for the Pages deployment to complete. Open the URL shown in that
   settings page, normally `https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/`.
   The published URL does not contain `/docs`.

Only `docs/` is needed to run the prebuilt website. Upload the remaining files
as well if you want the source and documentation available in the repository.
Include hidden files when possible (macOS: Command–Shift–Period), especially
`docs/.nojekyll`. If the uploader omits it, use **Add file → Create new file**,
name the file `docs/.nojekyll`, enter a single newline, and commit it.

No repository name needs to be entered into the code. Relative asset and data
paths support both project sites and `YOUR-USERNAME.github.io` root sites.

GitHub's browser uploader allows up to 100 files per upload and 25 MiB per
file. This prepared repository is checked against those limits. If a large
upload stalls, upload `docs/` first, then the remaining folders in another
upload, or use GitHub Desktop. Do not use Git LFS for files served by Pages.

## What is included

| View | Functions |
| --- | --- |
| Gene workspace | Default `fln`; 1–3 genes/TFs; labeled autocomplete; up to 30 neighbors per center; age-dependent proximity; all three pairwise age comparisons |
| Big picture | Five hdWGCNA module groups or six GNN program groups, matching colors, and multiple genes shown together |
| Both network views | Independent hdWGCNA, positive GNN, negative GNN, SCENIC arrow, and regulon-ring switches |
| Gene workspace navigation | Zoom, pan, fit-to-view, smart labels, and all-label controls |
| Explore | Per-gene network neighborhood and connection inspection |
| GNN dynamics | Age-specific graph diagnostics, transitions, and candidate tables |
| TF dynamics | SCENIC regulon activity and age patterns |
| Modules | Module membership, hubs, and functional annotations |
| Methods | Score definitions, caveats, provenance, hover help, and source links |

The selected-pair panel retains the full 2,847,691-pair correlation lookup,
including pairs outside the retained GNN graphs or coherent-trend lists.
The bundle preserves 62,535 GNN union pairs and 106,881 QC-retained SCENIC
connections. The network model is the existing all-gene atlas with six GNN
programs; this publication package does not replace it with the separate
mitochondrial-only analysis.

## Research data visibility

Publishing the website makes every file in `docs/` publicly downloadable,
including the complete bundled derived gene, expression-summary, regulatory,
and pair-correlation results. A private repository does not generally make
its Pages website private. Publish only the research results you intend to
share. See [DATA_PUBLICATION.md](DATA_PUBLICATION.md) for the exact contents.

## Edit and rebuild later

Publishing the supplied `docs/` needs no build tools. To change the source,
install Node.js 22.13 or newer and a compatible pnpm version (10 or newer), then run:

```sh
pnpm install --frozen-lockfile
pnpm run dev
```

After editing `app/page.tsx` or `app/globals.css`:

```sh
pnpm run build
pnpm run test
```

The build refreshes `docs/`. Commit and upload the changed source **and**
`docs/` to publish the update. Data in `public/data/` is the input to the build;
changing only `docs/data/` will be overwritten next time you build.

The existing dependency versions and lockfile have been retained. Some
dependencies come from the original local app; the GitHub build uses the
React/Vite entry point and does not run a Cloudflare Worker or Next.js server.

## Troubleshooting

- **404 at the site URL:** Confirm Pages uses `main` and `/docs`, and that
  `docs/index.html` exists. Check the deployment status in **Actions**.
- **Loading screen or data error:** Confirm both files in `docs/data/` were
  uploaded completely. Open `YOUR-SITE-URL/data/atlas.json` to check it loads.
- **Old version still displayed:** Wait for the deployment to finish, then
  refresh the page without using the cache.
- **Blank page after double-clicking index.html:** Open the GitHub Pages URL
  or use `pnpm run dev`; browsers restrict data requests from `file://` pages.
- **Changes missing after editing source:** Rebuild and upload `docs/`.

## Scientific scope and rights

These are descriptive results from the supplied analysis exports. Graph
membership and co-expression do not establish physical interactions or
causal regulation. The three ages have one source sample/library each.
The Methods view retains the original interpretation and SCENIC QC notes.

No new license for your research data or original application code is assigned
by this package. Third-party software notices are in
[THIRD-PARTY-NOTICES.txt](THIRD-PARTY-NOTICES.txt). Add your chosen license and
study citation when you are ready to distribute them.

Official guidance:
[publishing from a branch](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site),
[uploading files](https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository),
[Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits).
