# Zissou Archive

Notion-driven listing automation for second-hand menswear on Vinted.

- `scan-items.js` – scans Draft items: Claude Vision writes title, description and price, a humanizer pass rewrites the copy, a buyer-critic loop tunes the price, and the result goes back to Notion.
- `drop-prices.js` – scheduled Friday price drops down to each item's floor.

## Buyer-critic pricing loop

`lib/price-critic.js` runs after the description is final, so the critic judges exactly what a buyer would see on Vinted: the photos, title, description, condition and the asking price.

The goal is the top of what an informed buyer would accept, just under the point they would call it overpriced. Each round the critic, playing a buyer who knows the brand tier and its resale market, returns a verdict (`bargain`, `fair`, `top_of_fair`, `overpriced`), the highest price they would still pay (`ceiling`) and any objections.

The loop keeps a bracket: the highest price judged acceptable and the lowest judged overpriced. The next price tried is the buyer's ceiling when it falls inside the bracket, otherwise the midpoint, or 25% higher when nothing has been called overpriced yet. It stops on `top_of_fair`, when the bracket is within `CRITIC_STEP_EUR`, or after `CRITIC_MAX_ROUNDS`.

The final price is the highest acceptable price, rounded **down** to a clean Vinted figure (whole euros under €30, €5 steps to €150, €10 above) so rounding never tips it over. If every price tried was overpriced, it falls back to the lowest ceiling the buyer gave. The floor price is scaled by the same ratio so the Friday drops keep their shape. Each round is appended to the Price Audit field in Notion.

A critic error never loses the scan: the original price is kept and the error goes to stderr.

Settings in `config.js`: `CRITIC_MODEL` (defaults to the scan model, override with the `CRITIC_MODEL` env var), `CRITIC_MAX_ROUNDS` (4), `CRITIC_STEP_EUR` (5). Set `PRICE_CRITIC=0` to skip the loop.

## Tests

```bash
node --test tests/zissou-archive/*.test.js
```
