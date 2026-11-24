# Private compounds

Create an owner-only compound from **Create custom protocol → Add a private custom compound**. Choose standalone or blend, then use the existing protocol editor for stage doses, frequency, route and duration. Advanced settings allow ingredient names, units and masses to be edited. Private compounds never appear in the public catalogue or approved library.

Migration `0018_mature_risque.sql` adds a nullable catalogue owner reference; existing reference entries stay shared and unchanged. Private protocol, cycle and public-template validation enforce compound ownership. Existing cycle snapshots and recorded actual doses are unchanged by draft edits.

Missing injection volume retains the longer cooldown. Rotation uses recorded local dates across all completed injections, including historical corrections. Future records do not affect an earlier date's recency.

Account fixture cleanup must delete owned cycles and drafts before deleting an account that owns private compounds, because cycle snapshots retain compound references.

Authenticated browser QA for this change is pending: the browser connection was unavailable. Do not treat earlier UI screenshots as evidence for these changes.
