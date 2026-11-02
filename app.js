/* Bravofly demo — single-page flight booking flow instrumented for Amplitude.
   Synthetic data only. Event + property names must match the bulk dataset. */
(function () {
  "use strict";

  // ------------------------------------------------------------------ helpers
  const $ = (sel, root) => (root || document).querySelector(sel);
  const app = $("#app");
  const params = new URLSearchParams(window.location.search);
  const money = (n) => "£" + Number(n).toFixed(2);

  function track(name, props) {
    try {
      if (window.amplitude && typeof window.amplitude.track === "function") {
        window.amplitude.track(name, props || {});
      } else {
        console.debug("[track]", name, props || {});
      }
    } catch (e) { console.warn("track failed", name, e); }
  }

  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { t.hidden = true; }, 2200);
  }

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } }

  // ------------------------------------------------------------------ data
  const AIRPORTS = {
    LGW: "London", LHR: "London", STN: "London", LTN: "London", LCY: "London",
    MAN: "Manchester", EDI: "Edinburgh", BHX: "Birmingham",
    BCN: "Barcelona", AGP: "Malaga", FCO: "Rome", ALC: "Alicante", LIS: "Lisbon",
    AMS: "Amsterdam", CDG: "Paris", DUB: "Dublin", BER: "Berlin", KRK: "Krakow",
    BUD: "Budapest", JFK: "New York", DXB: "Dubai", BKK: "Bangkok"
  };
  const ROUTES = [
    { origin: "LGW", destination: "BCN", region: "Southern Europe", airlines: ["Vueling", "easyJet", "British Airways", "Ryanair", "Vueling"], lo: 39, hi: 160, dur: "2h 10m" },
    { origin: "STN", destination: "AGP", region: "Southern Europe", airlines: ["Ryanair", "easyJet", "Jet2", "Ryanair", "Vueling"], lo: 35, hi: 150, dur: "2h 55m" },
    { origin: "LHR", destination: "FCO", region: "Southern Europe", airlines: ["ITA Airways", "British Airways", "Vueling", "easyJet", "ITA Airways"], lo: 89, hi: 260, dur: "2h 35m" },
    { origin: "MAN", destination: "ALC", region: "Southern Europe", airlines: ["Jet2", "Ryanair", "easyJet", "Jet2", "TUI"], lo: 45, hi: 170, dur: "2h 50m" },
    { origin: "LGW", destination: "LIS", region: "Southern Europe", airlines: ["TAP", "easyJet", "British Airways", "Ryanair", "TAP"], lo: 55, hi: 190, dur: "2h 45m" },
    { origin: "LHR", destination: "AMS", region: "Western Europe", airlines: ["KLM", "British Airways", "easyJet", "KLM", "Vueling"], lo: 79, hi: 220, dur: "1h 15m" },
    { origin: "LCY", destination: "CDG", region: "Western Europe", airlines: ["Air France", "British Airways", "KLM", "Air France", "easyJet"], lo: 95, hi: 240, dur: "1h 20m" },
    { origin: "EDI", destination: "DUB", region: "Western Europe", airlines: ["Aer Lingus", "Ryanair", "easyJet", "Aer Lingus", "Ryanair"], lo: 29, hi: 110, dur: "1h 10m" },
    { origin: "BHX", destination: "BER", region: "Western Europe", airlines: ["easyJet", "Lufthansa", "Ryanair", "easyJet", "Eurowings"], lo: 49, hi: 180, dur: "1h 55m" },
    { origin: "LGW", destination: "KRK", region: "Eastern Europe", airlines: ["Wizz Air", "Ryanair", "easyJet", "Wizz Air", "LOT"], lo: 32, hi: 130, dur: "2h 30m" },
    { origin: "LTN", destination: "BUD", region: "Eastern Europe", airlines: ["Wizz Air", "easyJet", "Ryanair", "Wizz Air", "British Airways"], lo: 34, hi: 140, dur: "2h 35m" },
    { origin: "LHR", destination: "EDI", region: "UK Domestic", airlines: ["British Airways", "easyJet", "Loganair", "British Airways", "easyJet"], lo: 45, hi: 150, dur: "1h 25m" },
    { origin: "LHR", destination: "JFK", region: "Long Haul", airlines: ["British Airways", "Virgin Atlantic", "American Airlines", "Delta", "British Airways"], lo: 320, hi: 640, dur: "7h 55m" },
    { origin: "LHR", destination: "DXB", region: "Long Haul", airlines: ["Emirates", "British Airways", "Qatar Airways", "Emirates", "Etihad"], lo: 340, hi: 620, dur: "7h 05m" },
    { origin: "MAN", destination: "BKK", region: "Long Haul", airlines: ["Qatar Airways", "Emirates", "Etihad", "Turkish Airlines", "Qatar Airways"], lo: 420, hi: 640, dur: "13h 30m" }
  ];
  const DESTINATIONS = [
    { name: "Barcelona", code: "BCN", region: "Southern Europe", from: 39, c1: "#f59e0b", c2: "#ef4444" },
    { name: "Lisbon", code: "LIS", region: "Southern Europe", from: 55, c1: "#06b6d4", c2: "#3b82f6" },
    { name: "Rome", code: "FCO", region: "Southern Europe", from: 89, c1: "#a16207", c2: "#f97316" },
    { name: "Dublin", code: "DUB", region: "Western Europe", from: 29, c1: "#16a34a", c2: "#84cc16" },
    { name: "New York", code: "JFK", region: "Long Haul", from: 320, c1: "#1e3a8a", c2: "#7c3aed" }
  ];
  const AIRLINE_RATING = { "Vueling": 3.9, "easyJet": 4.1, "British Airways": 4.3, "Ryanair": 3.6, "Jet2": 4.4, "ITA Airways": 4.0, "TAP": 3.8, "KLM": 4.4, "Air France": 4.2, "Aer Lingus": 4.2, "Lufthansa": 4.3, "Wizz Air": 3.5, "LOT": 3.9, "Loganair": 4.0, "Virgin Atlantic": 4.5, "American Airlines": 3.9, "Delta": 4.2, "Emirates": 4.7, "Qatar Airways": 4.8, "Etihad": 4.5, "Turkish Airlines": 4.3, "TUI": 4.0, "Eurowings": 3.8 };
  const SERVICE_FEE = params.get("premium") === "1" ? 0 : 19.99;
  const PAYMENT_FEE_RATE = 0.025;
  const VARIANT = params.has("variant") ? (params.get("variant") === "treatment" ? "treatment" : "control") : null;

  function parseAirport(str, fallback) {
    const m = /\(([A-Z]{3})\)/.exec(str || "");
    if (m && AIRPORTS[m[1]]) return m[1];
    const name = (str || "").trim().toLowerCase();
    const hit = Object.keys(AIRPORTS).find((k) => AIRPORTS[k].toLowerCase() === name);
    return hit || fallback;
  }
  function findRoute(origin, destination) {
    return ROUTES.find((r) => r.origin === origin && r.destination === destination)
      || ROUTES.find((r) => r.destination === destination)
      || ROUTES[0];
  }
  function buildFlights(route) {
    const seed = route.origin.charCodeAt(0) + route.destination.charCodeAt(2);
    return route.airlines.map((airline, i) => {
      const t = (i + 1) / (route.airlines.length + 1);
      const fare = Math.round((route.lo + (route.hi - route.lo) * ((t * 7 + seed) % 1 * 0.6 + t * 0.4)) * 100) / 100;
      const depHour = 6 + ((i * 3 + seed) % 14);
      const stops = (i === 2 || i === 4) && route.region !== "UK Domestic" ? 1 : 0;
      return {
        id: i, airline, fare,
        dep: String(depHour).padStart(2, "0") + ":" + (i % 2 ? "35" : "10"),
        arr: String((depHour + 2 + stops * 2) % 24).padStart(2, "0") + ":" + (i % 2 ? "45" : "20"),
        stops, dur: route.dur, availability: i === 1 ? "low_stock" : "in_stock"
      };
    });
  }
  const fmt = (n) => Math.round(n * 100) / 100;

  // ------------------------------------------------------------------ state
  const state = {
    search: { origin: "LGW", destination: "BCN", trip_type: "return", passengers: 1, days_to_departure: 21 },
    route: null, flights: [], flight: null,
    fare: null, bags: 0, seat: false, voucher: null, voucherAttempted: false, feeDrawerOpened: false,
    reachedCheckout: false, bookingRef: null, attempts: 0, dealBannerTracked: false
  };

  function pricing() {
    const base = state.flight ? state.flight.fare : 0;
    const fareMult = state.fare === "flex" ? 1.35 : state.fare === "standard" ? 1.15 : 1;
    const fareTotal = fmt(base * fareMult * state.search.passengers);
    const extras = state.bags * 25 + (state.seat ? 8 : 0);
    const paymentFee = fmt((fareTotal + extras) * PAYMENT_FEE_RATE);
    const saving = state.voucher && state.voucher.valid ? state.voucher.saving : 0;
    const total = fmt(fareTotal + extras + SERVICE_FEE + paymentFee - saving);
    return { base, fareTotal, extras, serviceFee: SERVICE_FEE, paymentFee, saving, total, feeWaived: SERVICE_FEE === 0 };
  }
  function routeProps() {
    const r = state.route, f = state.flight;
    return {
      route: r.origin + "-" + r.destination, route_region: r.region, base_fare: f ? f.fare : null,
      origin: r.origin, destination: r.destination, airline: f ? f.airline : null,
      trip_type: state.search.trip_type, passengers: state.search.passengers
    };
  }
  function allInPrice(fare) {
    const p = state.search.passengers;
    return fmt(fare * p + SERVICE_FEE + fare * p * PAYMENT_FEE_RATE);
  }

  // ------------------------------------------------------------------ views
  function viewSearch() {
    const s = state.search;
    app.innerHTML = `
      <section class="hero">
        <h1>Find your next flight</h1>
        <p>Compare 400+ airlines. Thousands of flights, more than 500,000 hotels.</p>
        <form class="search-form" id="search-form" novalidate>
          <div class="trip-toggle" style="grid-column:1/-1">
            <label><input type="radio" name="trip" value="return" ${s.trip_type === "return" ? "checked" : ""}> Return</label>
            <label><input type="radio" name="trip" value="one_way" ${s.trip_type === "one_way" ? "checked" : ""}> One way</label>
          </div>
          <div class="field"><label for="from">From</label><input id="from" name="from" value="${AIRPORTS[s.origin]} (${s.origin})" autocomplete="off"></div>
          <div class="field"><label for="to">To</label><input id="to" name="to" value="${AIRPORTS[s.destination]} (${s.destination})" autocomplete="off"></div>
          <div class="field"><label for="depart">Depart</label><input id="depart" name="depart" type="date" value="${isoDaysFromNow(s.days_to_departure)}"></div>
          <div class="field"><label for="return">Return</label><input id="return" name="return" type="date" value="${isoDaysFromNow(s.days_to_departure + 7)}"></div>
          <div class="field"><label for="passengers">Passengers</label>
            <select id="passengers" name="passengers">${[1, 2, 3, 4].map((n) => `<option value="${n}" ${n === s.passengers ? "selected" : ""}>${n} ${n === 1 ? "adult" : "adults"}</option>`).join("")}</select>
          </div>
          <button type="submit" class="btn btn--accent">Search flights</button>
        </form>
      </section>

      <div class="banner">
        <div class="banner__icon">☀️</div>
        <div class="banner__text"><strong>Winter sun deals — up to 25% off</strong><small>Selected routes to Spain, Portugal and the Canaries. Book by Sunday.</small></div>
        <button class="btn btn--ghost btn--sm" id="see-deals">See deals</button>
      </div>

      <section class="section">
        <div class="section__head"><h2>Popular destinations from the UK</h2><p>Return fares, per person</p></div>
        <div class="tiles">
          ${DESTINATIONS.map((d) => `
            <button class="tile" data-dest="${d.code}" style="--c1:${d.c1};--c2:${d.c2}">
              <div class="tile__art"></div>
              <div class="tile__body"><h3>${d.name}</h3><small>from ${money(d.from)}</small></div>
            </button>`).join("")}
        </div>
      </section>

      <section class="trust">
        <div><strong>20 years of experience</strong><span>Hand-picked deals in our favourite destinations.</span></div>
        <div><strong>Secure payments</strong><span>3-D Secure checkout with all major cards.</span></div>
        <div><strong>24/7 customer care</strong><span>Help before, during and after your trip.</span></div>
      </section>`;

    if (!state.dealBannerTracked) {
      state.dealBannerTracked = true;
      track("Deal Banner Viewed", { deal_type: "banner", deal_pct: 25 });
    }

    $("#search-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const origin = parseAirport($("#from").value, "LGW");
      const destination = parseAirport($("#to").value, "BCN");
      const trip = (document.querySelector('input[name="trip"]:checked') || {}).value || "return";
      const dep = new Date($("#depart").value);
      const days = isNaN(dep) ? 21 : Math.max(0, Math.round((dep - startOfToday()) / 86400000));
      state.search = { origin, destination, trip_type: trip, passengers: Number($("#passengers").value) || 1, days_to_departure: days };
      const returning = lsGet("bf_returning") === "1";
      lsSet("bf_returning", "1");
      track("Flight Search Submitted", {
        origin, destination, trip_type: trip, passengers: state.search.passengers,
        days_to_departure: days, cabin_class: "economy",
        referrer_source: params.get("utm_source") || "direct", is_returning_visitor: returning
      });
      navigate("#/results");
    });

    $("#see-deals").addEventListener("click", () => {
      track("Destination Browsed", { destination_region: "Southern Europe", flights_shown: 24, filter_applied: false, sort_order: "popular" });
      state.search.destination = "AGP";
      state.search.origin = "STN";
      navigate("#/results");
    });
    app.querySelectorAll(".tile").forEach((tile) => tile.addEventListener("click", () => {
      const d = DESTINATIONS.find((x) => x.code === tile.dataset.dest);
      track("Destination Browsed", { destination_region: d.region, flights_shown: 18, filter_applied: false, sort_order: "popular" });
      state.search.destination = d.code;
      state.search.origin = findRoute("LGW", d.code).origin;
      navigate("#/results");
    }));
  }

  function viewResults() {
    const s = state.search;
    state.route = findRoute(s.origin, s.destination);
    state.flights = buildFlights(state.route);
    state.flight = null;
    const r = state.route;
    app.innerHTML = `
      <div class="page-head">
        <div><h1>Flights from ${AIRPORTS[r.origin]} to ${AIRPORTS[r.destination]}</h1>
        <p>${r.origin} → ${r.destination} · ${s.trip_type === "return" ? "Return" : "One way"} · ${s.passengers} ${s.passengers === 1 ? "adult" : "adults"} · Economy</p></div>
        <a href="#/" class="btn btn--link">Change search</a>
      </div>
      <div class="chips">
        <button class="chip" data-chip="Direct only">Direct only</button>
        <button class="chip" data-chip="Cheapest first">Cheapest first</button>
        <button class="chip" data-chip="Fastest first">Fastest first</button>
      </div>
      <div class="results" id="results"></div>`;
    renderFlights(state.flights);

    if (VARIANT) {
      track("$exposure", { flag_key: "all-in-pricing-results", variant: VARIANT });
      track("statsig::config_exposure", {
        config: "all_in_pricing_results", ruleID: "6tJqN2vXk8ZcP4rLwB1yHd",
        experimentGroupName: VARIANT === "treatment" ? "Test" : "Control",
        reason: "Network", unitID: "userID", isExperimentActive: true, isUserInExperiment: true
      });
    }

    app.querySelectorAll(".chip").forEach((chip) => chip.addEventListener("click", () => {
      chip.classList.toggle("chip--on");
      let list = state.flights.slice();
      const on = (label) => !!app.querySelector(`.chip[data-chip="${label}"].chip--on`);
      if (on("Direct only")) list = list.filter((f) => f.stops === 0);
      if (on("Cheapest first")) list.sort((a, b) => a.fare - b.fare);
      if (on("Fastest first")) list.sort((a, b) => a.stops - b.stops || a.dep.localeCompare(b.dep));
      track("Flight Search Refined", { search_query: chip.dataset.chip, results_returned: list.length, no_flights_found: list.length === 0 });
      renderFlights(list);
    }));
  }

  function renderFlights(list) {
    const r = state.route;
    const treatment = VARIANT === "treatment";
    $("#results").innerHTML = list.map((f) => `
      <article class="card flight" data-id="${f.id}">
        <div class="flight__airline">${f.airline}<small>${r.region} · ${f.dur}</small></div>
        <div class="flight__times">
          <div class="flight__time">${f.dep}<small>${r.origin}</small></div>
          <div class="flight__line">${f.stops ? "1 stop" : "Direct"}</div>
          <div class="flight__time">${f.arr}<small>${r.destination}</small></div>
        </div>
        <div class="flight__price">
          <div>
            <span class="amount">${treatment ? money(allInPrice(f.fare)) : money(f.fare)}</span>
            <small>${treatment ? "incl. all fees" : "per person, excl. fees"}${f.availability === "low_stock" ? '<span class="tag tag--warn">Few seats left</span>' : ""}</small>
          </div>
          <button class="btn btn--primary btn--sm" data-select="${f.id}">View details</button>
        </div>
      </article>`).join("") || `<div class="card">No flights found for this filter.</div>`;

    app.querySelectorAll("[data-select]").forEach((b) => b.addEventListener("click", () => {
      const f = state.flights.find((x) => x.id === Number(b.dataset.select));
      state.flight = f;
      state.fare = null; state.bags = 0; state.seat = false; state.voucher = null;
      state.voucherAttempted = false; state.feeDrawerOpened = false; state.reachedCheckout = false;
      track("Flight Details Viewed", {
        ...routeProps(), days_to_departure: state.search.days_to_departure,
        airline_rating: AIRLINE_RATING[f.airline] || 4.0,
        airline_reviews_count: 180 + (f.airline.length * 97) % 900,
        seat_availability: f.availability
      });
      navigate("#/fare");
    }));
  }

  function viewFare() {
    if (!state.flight) { navigate("#/results"); return; }
    const r = state.route, f = state.flight, s = state.search;
    const alts = state.flights.filter((x) => x.id !== f.id).slice(0, 2);
    const fareCard = (key, label, mult, perks) => `
      <div class="card fare ${state.fare === key ? "fare--selected" : ""}">
        <h3>${label}</h3>
        <span class="amount">${money(fmt(f.fare * mult))}</span>
        <ul>${perks.map((p) => `<li>${p}</li>`).join("")}</ul>
        <button class="btn ${state.fare === key ? "btn--accent" : "btn--primary"}" data-fare="${key}">Select ${label} fare</button>
      </div>`;
    app.innerHTML = `
      <div class="page-head"><h1>Choose your fare</h1><a href="#/results" class="btn btn--link">Back to results</a></div>
      <section class="card">
        <div class="summary">
          <div class="summary__route">${AIRPORTS[r.origin]} (${r.origin}) → ${AIRPORTS[r.destination]} (${r.destination})</div>
          <div class="summary__meta">${f.airline} · ${f.dep}–${f.arr} · ${f.stops ? "1 stop" : "Direct"} · ${s.trip_type === "return" ? "Return" : "One way"} · ${s.passengers} ${s.passengers === 1 ? "adult" : "adults"}</div>
        </div>
        <div class="actions">
          <button class="btn btn--ghost btn--sm" id="read-reviews">Read airline reviews</button>
          <button class="btn btn--ghost btn--sm" id="save-flight">Save this flight</button>
        </div>
        <div class="reviews" id="reviews" hidden>
          <strong>${f.airline} · ${AIRLINE_RATING[f.airline] || 4.0} / 5 from recent travellers</strong>
          <div class="review"><strong>Hannah, Leeds</strong> — Smooth boarding, on time, decent legroom for the price.</div>
          <div class="review"><strong>Tom, Bristol</strong> — Cabin bag rules were confusing but the crew were lovely.</div>
          <div class="review"><strong>Priya, London</strong> — Flight was fine. Wish the fees were clearer before paying.</div>
        </div>
      </section>

      <section class="section">
        <h2>Fare options</h2>
        <div class="fares">
          ${fareCard("basic", "Basic", 1, ["Small cabin bag only", "No changes or refunds", "Random seat"])}
          ${fareCard("standard", "Standard", 1.15, ["Cabin bag + 10 kg bag", "Changes for a fee", "Standard seat choice"])}
          ${fareCard("flex", "Flex", 1.35, ["Cabin bag + 23 kg bag", "Free changes", "Any seat + priority boarding"])}
        </div>
        <div class="addons">
          <label><input type="checkbox" id="addon-bag" ${state.bags ? "checked" : ""}> Add checked bag (+£25)</label>
          <label><input type="checkbox" id="addon-seat" ${state.seat ? "checked" : ""}> Choose seat (+£8)</label>
        </div>
      </section>

      <section class="section">
        <h2>Alternative flights</h2>
        <div class="alts">
          ${alts.map((a, i) => `
            <div class="card alt">
              <div><strong>${a.airline}</strong><small>${a.dep}–${a.arr} · ${a.stops ? "1 stop" : "Direct"} · ${money(a.fare)} pp</small></div>
              <button class="btn btn--ghost btn--sm" data-alt="${a.id}" data-pos="${i + 1}">Select this flight instead</button>
            </div>`).join("")}
        </div>
      </section>

      <div class="sticky-bar" id="sticky" hidden>
        <div class="sticky-bar__total" id="sticky-total"></div>
        <button class="btn btn--link" id="view-fees">View fee breakdown</button>
        <button class="btn btn--primary" id="to-checkout">Continue to passenger details</button>
      </div>`;

    $("#read-reviews").addEventListener("click", () => {
      $("#reviews").hidden = false;
      track("Airline Reviews Read", { route: r.origin + "-" + r.destination, reviews_read: 3, avg_rating_viewed: AIRLINE_RATING[f.airline] || 4.0 });
    });
    $("#save-flight").addEventListener("click", () => {
      track("Flight Saved", { route: r.origin + "-" + r.destination, route_region: r.region });
      toast("Flight saved to your list");
    });
    $("#addon-bag").addEventListener("change", (e) => { state.bags = e.target.checked ? 1 : 0; updateSticky(); });
    $("#addon-seat").addEventListener("change", (e) => { state.seat = e.target.checked; updateSticky(); });

    app.querySelectorAll("[data-fare]").forEach((b) => b.addEventListener("click", () => {
      state.fare = b.dataset.fare;
      app.querySelectorAll(".fare").forEach((c) => c.classList.remove("fare--selected"));
      b.closest(".fare").classList.add("fare--selected");
      app.querySelectorAll("[data-fare]").forEach((x) => { x.className = "btn btn--primary"; });
      b.className = "btn btn--accent";
      const p = pricing();
      track("Fare Selected", {
        ...routeProps(), fare_total: p.fareTotal, fare_type: state.fare,
        bags_added: state.bags, seat_selected: state.seat, currency: "GBP"
      });
      updateSticky();
    }));

    app.querySelectorAll("[data-alt]").forEach((b) => b.addEventListener("click", () => {
      const a = state.flights.find((x) => x.id === Number(b.dataset.alt));
      track("Alternative Flight Clicked", {
        route: r.origin + "-" + r.destination, route_region: r.region, base_fare: a.fare,
        airline: a.airline, suggestion_type: "similar", position_in_list: Number(b.dataset.pos)
      });
      state.flight = a; state.fare = null;
      viewFare();
      window.scrollTo(0, 0);
    }));

    $("#view-fees").addEventListener("click", openFeeDrawer);
    $("#to-checkout").addEventListener("click", () => navigate("#/checkout"));
    updateSticky();
  }

  function updateSticky() {
    const bar = $("#sticky");
    if (!bar) return;
    if (!state.fare) { bar.hidden = true; return; }
    const p = pricing();
    bar.hidden = false;
    $("#sticky-total").innerHTML = `Total ${money(p.total)}<small>${state.search.passengers} ${state.search.passengers === 1 ? "passenger" : "passengers"} · ${state.fare} fare · incl. fees</small>`;
  }

  function openFeeDrawer(rerender) {
    const p = pricing();
    const r = state.route;
    state.feeDrawerOpened = true;
    if (!rerender) {
      track("Fee Breakdown Viewed", {
        route: r.origin + "-" + r.destination, base_fare: state.flight.fare,
        service_fee: p.serviceFee, payment_fee: p.paymentFee, total_payable: p.total, fee_waived: p.feeWaived
      });
    }
    const root = $("#drawer-root");
    root.innerHTML = `
      <div class="drawer-backdrop" id="drawer-backdrop">
        <aside class="drawer" role="dialog" aria-label="Price breakdown">
          <div class="drawer__head"><h2>Price breakdown</h2><button class="btn btn--ghost btn--sm" id="drawer-close">Close</button></div>
          <table>
            <tr><td>Base fare (${state.search.passengers} × ${money(fmt(p.fareTotal / state.search.passengers))})</td><td>${money(p.fareTotal)}</td></tr>
            ${p.extras ? `<tr><td>Bags & seats</td><td>${money(p.extras)}</td></tr>` : ""}
            <tr><td>Service fee</td><td>${money(p.serviceFee)}</td></tr>
            <tr><td>Card payment fee (2.5%)</td><td>${money(p.paymentFee)}</td></tr>
            <tr class="upsell"><td>Bravofly Premium<small>Skip service fees on every booking for a year. <a href="javascript:void(0)" id="premium-more">Learn more</a></small></td><td>£49.99/yr</td></tr>
            ${p.saving ? `<tr><td>Voucher ${state.voucher.code}</td><td>−${money(p.saving)}</td></tr>` : ""}
            <tr class="total"><td>Total payable</td><td>${money(p.total)}</td></tr>
          </table>
          <label for="voucher-input"><strong>Have a voucher?</strong></label>
          <div class="voucher"><input id="voucher-input" placeholder="Voucher code" autocomplete="off"><button class="btn btn--primary" id="voucher-apply">Apply</button></div>
          <div class="voucher-msg" id="voucher-msg"></div>
          <div class="drawer__foot"><button class="btn btn--accent btn--block" id="drawer-continue">Continue with this price</button></div>
        </aside>
      </div>`;
    const close = () => { root.innerHTML = ""; updateSticky(); };
    $("#drawer-close").addEventListener("click", close);
    $("#drawer-backdrop").addEventListener("click", (e) => { if (e.target.id === "drawer-backdrop") close(); });
    $("#drawer-continue").addEventListener("click", () => { close(); navigate("#/checkout"); });
    // "Learn more" intentionally does nothing (dead-click bait for Session Replay).
    $("#voucher-apply").addEventListener("click", () => {
      const code = ($("#voucher-input").value || "").trim().toUpperCase();
      const valid = code === "SAVE10";
      const saving = valid ? fmt((p.fareTotal + p.extras) * 0.10) : 0;
      state.voucherAttempted = true;
      state.voucher = { code, valid, saving };
      track("Voucher Code Entered", { voucher_code: code, voucher_valid: valid, voucher_saving: saving });
      const msg = $("#voucher-msg");
      msg.className = "voucher-msg " + (valid ? "voucher-msg--ok" : "voucher-msg--bad");
      msg.textContent = valid ? `Voucher applied — you save ${money(saving)}` : "That voucher code isn't valid.";
      if (valid) openFeeDrawer(true); // re-render with discount row (no second tracking call)
    });
  }

  function viewCheckout() {
    if (!state.flight || !state.fare) { navigate("#/fare"); return; }
    const p = pricing(), r = state.route, f = state.flight;
    state.reachedCheckout = true;
    state.attempts = 0;
    track("Passenger Details Started", {
      route: r.origin + "-" + r.destination, total_payable: p.total,
      card_saved: false, fee_waived: p.feeWaived, currency: "GBP"
    });
    app.innerHTML = `
      <div class="page-head"><h1>Passenger details</h1><a href="#/fare" class="btn btn--link">Back to fare</a></div>
      <div class="checkout">
        <form class="card" id="checkout-form" novalidate>
          <h2>Lead passenger</h2>
          <div class="form-grid">
            <div class="field"><label for="first">First name</label><input id="first" placeholder="First name" autocomplete="given-name"></div>
            <div class="field"><label for="last">Last name</label><input id="last" placeholder="Last name" autocomplete="family-name"></div>
            <div class="field field--full"><label for="email">Email</label><input id="email" type="email" placeholder="Email" autocomplete="email"></div>
          </div>
          <h2 style="margin-top:18px">Payment</h2>
          <div class="form-grid">
            <div class="field field--full"><label for="card">Card number</label><input id="card" inputmode="numeric" placeholder="Card number" autocomplete="cc-number"></div>
            <div class="field"><label for="expiry">Expiry (MM/YY)</label><input id="expiry" placeholder="Expiry (MM/YY)" autocomplete="cc-exp"></div>
            <div class="field"><label for="cvc">CVC</label><input id="cvc" inputmode="numeric" placeholder="CVC" autocomplete="cc-csc"></div>
          </div>
          <label class="check"><input type="checkbox" id="accept"> I accept the fare rules and privacy policy</label>
          <div id="pay-error" hidden></div>
          <button type="submit" class="btn btn--accent btn--block" id="pay">Pay securely</button>
          <p class="secure">🔒 Payments are protected with 3-D Secure. Your bank may ask you to confirm this payment.</p>
        </form>
        <aside class="card order-summary">
          <h3>Order summary</h3>
          <p><strong>${AIRPORTS[r.origin]} → ${AIRPORTS[r.destination]}</strong><br><span class="summary__meta">${f.airline} · ${f.dep}–${f.arr} · ${state.fare} fare</span></p>
          <table>
            <tr><td>Fare (${state.search.passengers} pax)</td><td>${money(p.fareTotal)}</td></tr>
            ${p.extras ? `<tr><td>Bags & seats</td><td>${money(p.extras)}</td></tr>` : ""}
            <tr><td>Service fee</td><td>${money(p.serviceFee)}</td></tr>
            <tr><td>Card payment fee</td><td>${money(p.paymentFee)}</td></tr>
            ${p.saving ? `<tr><td>Voucher</td><td>−${money(p.saving)}</td></tr>` : ""}
            <tr class="total"><td>Total</td><td>${money(p.total)}</td></tr>
          </table>
        </aside>
      </div>`;

    $("#checkout-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const btn = $("#pay");
      if (btn.disabled) return;
      const card = ($("#card").value || "").replace(/\s+/g, "");
      const errBox = $("#pay-error");
      errBox.hidden = true;
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Confirming with your bank…';
      setTimeout(() => {
        btn.disabled = false;
        btn.textContent = "Pay securely";
        if (card.startsWith("4000")) {
          state.attempts += 1;
          const message = "We couldn't confirm your payment with your bank. Please try again.";
          console.error("3DS redirect timed out");
          track("Payment Error", {
            error_code: "3DS_REDIRECT_TIMEOUT", error_message: message, payment_method: "card",
            attempt: state.attempts, total_payable: p.total, currency: "GBP", psp: "adyen"
          });
          errBox.className = "error-box";
          errBox.innerHTML = `<span>⚠️</span><span>${message}</span>`;
          errBox.hidden = false;
          return;
        }
        state.bookingRef = makeRef();
        navigate("#/confirmed");
      }, 1500);
    });
  }

  function viewConfirmed() {
    if (!state.flight || !state.bookingRef) { navigate("#/"); return; }
    const p = pricing(), r = state.route;
    track("Booking Confirmed", {
      booking_reference: state.bookingRef, ...routeProps(),
      total_payable: p.total, service_fee: p.serviceFee, payment_fee: p.paymentFee, currency: "GBP",
      is_first_booking: true, voucher_applied: !!(state.voucher && state.voucher.valid)
    });
    try {
      if (window.amplitude && window.amplitude.Revenue && window.amplitude.revenue) {
        const rev = new window.amplitude.Revenue()
          .setProductId(r.origin + "-" + r.destination).setPrice(p.total).setQuantity(1).setRevenueType("flight_booking");
        window.amplitude.revenue(rev);
      }
    } catch (e) { console.warn("revenue failed", e); }
    const ref = state.bookingRef;
    state.reachedCheckout = true;
    app.innerHTML = `
      <section class="card confirmed">
        <div class="confirmed__icon">✓</div>
        <h1>Booking confirmed</h1>
        <p class="meta">Booking reference</p>
        <div class="ref">${ref}</div>
        <p><strong>${AIRPORTS[r.origin]} (${r.origin}) → ${AIRPORTS[r.destination]} (${r.destination})</strong><br>
        <span class="meta">${state.flight.airline} · ${state.flight.dep}–${state.flight.arr} · ${state.fare} fare · ${money(p.total)} paid</span></p>
        <p class="meta">We've emailed your e-ticket. Have a great trip!</p>
        <button class="btn btn--primary" id="back-home">Back to search</button>
      </section>`;
    $("#back-home").addEventListener("click", () => {
      state.flight = null; state.fare = null; state.bookingRef = null; state.reachedCheckout = false;
      navigate("#/");
    });
  }

  // ------------------------------------------------------------------ router
  const routes = { "": viewSearch, "/": viewSearch, "/results": viewResults, "/fare": viewFare, "/checkout": viewCheckout, "/confirmed": viewConfirmed };
  function navigate(hash) {
    if (window.location.hash === hash) { render(); } else { window.location.hash = hash; }
  }
  function render() {
    $("#drawer-root").innerHTML = "";
    const path = (window.location.hash || "#/").replace(/^#/, "");
    (routes[path] || viewSearch)();
    window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", render);

  // Fare Abandoned — user picked a fare but never reached passenger details.
  let abandonedSent = false;
  function sendAbandon() {
    if (abandonedSent || !state.fare || state.reachedCheckout || !state.route) return;
    abandonedSent = true;
    const p = pricing();
    track("Fare Abandoned", {
      route: state.route.origin + "-" + state.route.destination, fare_total: p.fareTotal,
      abandon_reason: state.feeDrawerOpened ? "pricing_screen" : "other", voucher_attempted: state.voucherAttempted
    });
  }
  window.addEventListener("pagehide", sendAbandon);
  window.addEventListener("beforeunload", sendAbandon);

  // ------------------------------------------------------------------ utils
  function startOfToday() { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }
  function isoDaysFromNow(n) { const d = startOfToday(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
  function makeRef() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let s = "";
    for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
  }

  render();
})();
