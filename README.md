# webflow-scripts

Custom JavaScript and CSS for a few Webflow sites, served from this repo by jsDelivr.

## Status: frozen

This repo serves these sites only:

- `projects/ready-hit-play-prod`
- `projects/the-signalling-company`
- `projects/nem-life`
- `projects/jayshetty`

Live sites load files by git tag, for example
`https://cdn.jsdelivr.net/gh/studiozissou/webflow-scripts@<tag>/projects/<client>/init.js`.
Tags are never moved or deleted.

New work for these clients, and all work for other clients, lives elsewhere. This repo gets
no new features.

## Tests

```bash
npm ci
npm test
```
