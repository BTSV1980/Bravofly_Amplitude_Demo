# Bravofly demo site (Amplitude Vision Demo)

Single-page, no-build flight-booking site that mirrors the Bravofly UK journey and fires the exact
Amplitude events used by the bulk dataset in project **897282**. Synthetic data only — text wordmark,
no brand assets.

Files: `index.html`, `app.js`, `styles.css`, `.nojekyll`. Everything is referenced relatively, so the
site works at a sub-path such as `https://<user>.github.io/bravofly-demo/`.

## Publish on GitHub Pages (company-approved hosting)

1. Create a new **public** repository, e.g. `bravofly-demo`.
2. Copy these five files into the repo root and push to `main`.
3. In the repo go to **Settings → Pages**. Under *Build and deployment* set **Source = "Deploy from a branch"**,
   branch **`main`**, folder **`/ (root)`**, click **Save**.
4. Wait ~1 minute. The site is live at `https://<user-or-org>.github.io/bravofly-demo/`.
5. Open it once and check the Amplitude debugger (Live events) for `Deal Banner Viewed` — if it arrives,
   analytics, Session Replay and Guides & Surveys are all wired (same API key, loaded synchronously).

Pushing to `main` redeploys automatically.

## URL parameters

| Param | Effect |
| --- | --- |
| `?variant=treatment` | Results page shows **all-in prices** ("incl. all fees"); fires `$exposure` + `statsig::config_exposure` with the Test group. |
| `?variant=control` | Results page shows base fares ("excl. fees"); fires both exposure events with the Control group. No `variant` param → no exposure events. |
| `?premium=1` | Service fee waived (£0.00) → `fee_waived: true` in the fee breakdown. |
| `?utm_source=google` | Sets `referrer_source` on `Flight Search Submitted` (default `direct`). Standard UTM attribution is also captured by the SDK. |

Params survive hash navigation (`#/results`, `#/fare` …) because the page never reloads.

## Test conventions

- **Card number starting with `4000`** → every "Pay securely" click fails with the 3-D Secure timeout
  (`Payment Error`, `error_code: 3DS_REDIRECT_TIMEOUT`, `attempt` increments). Click repeatedly to create a
  rage-click pattern in Session Replay. A `console.error` is written each time.
- **Any other card (e.g. `4242 4242 4242 4242`)** → success → `#/confirmed`.
- **Voucher `SAVE10`** → 10% off the fare (`voucher_valid: true`); anything else is invalid.
- The **"Learn more"** link in the price breakdown drawer intentionally does nothing (dead-click bait).
- Drawer buttons: **"Close"** returns to the fare page; **"Continue with this price"** goes straight to checkout
  (the sticky bar's **"Continue to passenger details"** does the same — texts differ so bots can target either).

## Journey

`#/` search → `#/results` → `#/fare` (select a fare → sticky total + "View fee breakdown") → `#/checkout` → `#/confirmed`

## Events

| Event | Trigger | Key properties |
| --- | --- | --- |
| `Deal Banner Viewed` | Search page renders (once per load) | `deal_type`, `deal_pct` |
| `Flight Search Submitted` | "Search flights" | `origin`, `destination`, `trip_type`, `passengers`, `days_to_departure`, `cabin_class`, `referrer_source`, `is_returning_visitor` |
| `Destination Browsed` | Destination tile or "See deals" | `destination_region`, `flights_shown`, `filter_applied`, `sort_order` |
| `$exposure` / `statsig::config_exposure` | Results render, only with `?variant=` | `flag_key`, `variant` / `config`, `ruleID`, `experimentGroupName`, … |
| `Flight Search Refined` | Chips "Direct only", "Cheapest first", "Fastest first" | `search_query`, `results_returned`, `no_flights_found` |
| `Flight Details Viewed` | "View details" | `route`, `route_region`, `base_fare`, `origin`, `destination`, `airline`, `trip_type`, `passengers`, `days_to_departure`, `airline_rating`, `airline_reviews_count`, `seat_availability` |
| `Airline Reviews Read` | "Read airline reviews" | `route`, `reviews_read`, `avg_rating_viewed` |
| `Flight Saved` | "Save this flight" | `route`, `route_region` |
| `Alternative Flight Clicked` | "Select this flight instead" | `route`, `route_region`, `base_fare`, `airline`, `suggestion_type`, `position_in_list` |
| `Fare Selected` | "Select Basic/Standard/Flex fare" | route props + `fare_total`, `fare_type`, `bags_added`, `seat_selected`, `currency` |
| `Fee Breakdown Viewed` | "View fee breakdown" | `route`, `base_fare`, `service_fee`, `payment_fee`, `total_payable`, `fee_waived` |
| `Voucher Code Entered` | "Apply" in the drawer | `voucher_code`, `voucher_valid`, `voucher_saving` |
| `Passenger Details Started` | `#/checkout` renders | `route`, `total_payable`, `card_saved`, `fee_waived`, `currency` |
| `Payment Error` | "Pay securely" with a `4000…` card | `error_code`, `error_message`, `payment_method`, `attempt`, `total_payable`, `currency`, `psp` |
| `Booking Confirmed` (+ revenue) | `#/confirmed` renders | `booking_reference`, route props, `total_payable`, `service_fee`, `payment_fee`, `currency`, `is_first_booking`, `voucher_applied` |
| `Fare Abandoned` | Page hidden/closed after a fare was selected but checkout never reached | `route`, `fare_total`, `abandon_reason` (`pricing_screen` if the fee drawer was opened), `voucher_attempted` |

Autocapture (page views, element clicks, form interactions, rage/dead clicks, network, web vitals) and
Session Replay (100% sample) are on. Guides & Surveys is loaded via the engagement plugin, so any guide or
survey published for this project will render here.
