# Data included in the GitHub Pages package

This package prepares the existing all-gene web atlas for publication. It does
not change the fitted networks, compute new statistics, or incorporate the
later mitochondrial-only GNN analysis.

## Public files

- `docs/data/atlas.json`: gene identifiers, module/program assignments,
  expression and detection summaries by age, network connections, SCENIC
  candidate regulation and activity, graph diagnostics, enrichments,
  candidate tables, and methodological/QC annotations.
- `docs/data/all-pair-correlations.i16`: signed Pearson correlations for all
  2,847,691 pairs among the 2,387 analysis genes, for D0, D25, and D50.
  The metadata and gene ordering needed to decode it are in `atlas.json`.
  Binary encoding is a size optimization, not access protection.
- `docs/assets/`: the complete compiled client application and styles.
- `docs/og.png`: the existing image asset from the source atlas.
- `public/`: source copies of the data/assets used for future builds.

The gene universe, data values, model results, and QC exclusions are preserved.
Only `atlas.json`'s unused `meta.localOnly` flag changes to `false` in the
published output to reflect the hosting mode. The source copy retains its
original provenance flag.

## Excluded from the package

The full single-cell count matrix, cell-level metadata CSV, raw analysis
folders, research manuscripts, older releases, original Git history, local
paths/configuration, authentication scaffolding, database files, hosting
project identifiers, environment files, and installed dependencies are not
included. The derived summaries listed above remain fully downloadable.

## Privacy

Standard GitHub Pages sites are public, including sites built from a private
repository on a plan that supports it. Only publish if these derived results
are approved for public release. The application has no visitor login,
telemetry, external inference service, or application database. Assets and
datasets are fetched from the same host as the website. GitHub still serves
the website and handles normal hosting traffic. External method references
open only when a visitor clicks them.

Source: [GitHub Pages publishing documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).
