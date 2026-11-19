# FindIT's deterministic match suggestions

FindIT compares an open lost report with public, approved found reports. A reporter can see suggestions while their lost report is still pending publication; those suggestions are visible only to the reporter and authorized station staff. This is a rules-based similarity ranking, not AI, a probability, proof of ownership, or evidence that police possess an item.

## Eligibility

- The lost report must remain `open`. It can be the viewer's own pending report or an approved public listing.
- The candidate must be an approved public found report in `pending_surrender`, `received_by_police`, or `in_custody`.
- Reports more than 30 days apart are excluded.
- Found candidates come only from the safe `public_items` view. For a still-private lost report, the app uses the authorized report already loaded for its reporter or assigned staff; the matcher compares only category, title, description, color, date, and approximate area. It does not score private clues, account contacts, claim answers, reporter identities, or precise coordinates.
- Approximate public area text is compared server-side and is omitted from returned match results and cards. A candidate in `pending_surrender` is labeled **Reported — Not Received**; it is not proof of police custody.

## Score

| Signal | Weight | Comparison |
| --- | ---: | --- |
| Category | 25 | Normalized exact category agreement (otherwise zero). |
| Title and description | 30 | Dice overlap of normalized tokens after case/diacritic/punctuation normalization and common-word removal. |
| Color | 15 | Common legacy names map to the report form's HEX palette, then HEX colors are compared by CIE76 Lab distance. Distance is converted to a 0–1 similarity over a 100-point range. Unmapped legacy and compound names keep normalized exact/token-overlap comparison. |
| Date | 15 | Starts at full weight on the same date and decreases linearly to zero at 30 days. |
| Approximate area | 15 | Dice overlap of public, moderated area tokens. |

For each pair, the final score is the weighted mean of available signals, scaled to 0–100. A signal is available only when both reports provide a usable value. The matcher requires at least three available signals; otherwise it displays **Not enough details to compare** without a score. Category disagreement reduces the score but does not hard-filter a candidate. Results sort by score, date gap, then stable report ID.

Plain-language reasons name the observed signals, such as **Same category**, **Similar description**, **Same color**, **Reported nearby**, or **Reported 2 days apart**. Each expanded signal row has a compact progress bar for its weighted contribution, the numeric contribution out of its maximum points after renormalization, and a separate signal-similarity percentage. Missing signals have no bar or zero value; they explain why they were omitted. If fewer than three signals are available, no weighted contributions or total score are shown. Coordinates and private fields are excluded from the returned result shape.

New report color selections are saved as validated `#RRGGBB` strings; **Not sure** remains an unavailable-signal value. Existing named colors are preserved when a report is edited without changing its color. The same standard palette names (including Black, Silver, Red, Green, and Blue) map to their defined HEX swatches, so old named reports compare directly with new HEX reports. For two recognized HEX colors, CIE76 Lab distance yields `max(0, 1 - distance / 100)`; exact colors score 100%, nearer colors score higher, and far-apart colors can score 0%. Other legacy values retain the prior text-token fallback.

The detail page presents the total similarity score and each signal contribution as animated progress bars with exact values available to assistive technology. They are not probabilities or confirmations. Breakdown bars animate briefly when opened; reduced-motion preferences show their final values immediately. Pairs without enough signals show no total or weighted contribution.

All unit fixtures use synthetic report IDs and sample items. No invented reports are inserted into the live project.
