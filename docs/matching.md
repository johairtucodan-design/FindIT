# FindIT's deterministic match suggestions

FindIT compares public, approved lost reports with public, approved found reports. This is a rules-based similarity ranking, not AI, a probability, proof of ownership, or evidence that police possess an item.

## Eligibility

- The lost report must be approved for public listing and remain `open`.
- The candidate must be a found report in `pending_surrender`, `received_by_police`, or `in_custody`.
- Reports more than 30 days apart are excluded.
- Only the safe `public_items` view is queried. The matcher never reads private clues, claim answers, contact data, reporter identities, or precise coordinates.
- Approximate public area text is compared server-side and is omitted from returned match results and cards. A candidate in `pending_surrender` is labeled **Reported — Not Received**; it is not proof of police custody.

## Score

| Signal | Weight | Comparison |
| --- | ---: | --- |
| Category | 25 | Normalized exact category agreement (otherwise zero). |
| Title and description | 30 | Dice overlap of normalized tokens after case/diacritic/punctuation normalization and common-word removal. |
| Color | 15 | Exact normalized color or token overlap for compound colors. |
| Date | 15 | Starts at full weight on the same date and decreases linearly to zero at 30 days. |
| Approximate area | 15 | Dice overlap of public, moderated area tokens. |

For each pair, the final score is the weighted mean of available signals, scaled to 0–100. A signal is available only when both reports provide a usable value. The matcher requires at least three available signals; otherwise it displays **Not enough details to compare** without a score. Category disagreement reduces the score but does not hard-filter a candidate. Results sort by score, date gap, then stable report ID.

Plain-language reasons name the observed signals, such as **Same category**, **Similar description**, **Same color**, **Reported nearby**, or **Reported 2 days apart**. Missing fields are not treated as disagreement. Coordinates and private fields are excluded from the returned result shape.

All unit fixtures use synthetic report IDs and sample items. No invented reports are inserted into the live project.
