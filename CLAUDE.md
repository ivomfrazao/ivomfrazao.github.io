# CLAUDE.md

## Pre-render before committing

Always run `node build.js` before creating any git commit or push. This script
pre-renders `index.html` and generates `case-studies/*.html` from source data
for SEO. It has no dependencies and completes in under a second.
