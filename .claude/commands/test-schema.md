Test JSON-LD schema via Google Rich Results Test.

Load the `test-schema` skill, then run the full validation loop against the provided URL.

## Arguments
- `$ARGUMENTS` — the live page URL to test (e.g. `https://www.carsa.co.uk/`), optionally followed by the schema file path

## Defaults
- If no URL provided, ask the user
- If no schema file path provided, search `projects/<client>/schema/` for the relevant file
