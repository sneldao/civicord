# Caveats — read before citing

These caveats are part of the evidence bundle. Do not quote a row without them.

1. `live` is an HTTP-response class, not proof of content survival.
2. `gone`, `redirected`, `repurposed_suspect` and related labels are ledger
   heuristics, not evidence of intent.
3. A DNS or HTTP failure is not proof that a campaign deliberately removed a
   site. Temporary outages, hosting errors, bot blocking and configuration
   problems can produce similar observations.
4. Redirects are noisy. Many are same-site TLD changes, HTTP-to-HTTPS moves,
   party CMS moves or platform artefacts.
5. Surname matching is a heuristic. Shared party infrastructure and branch
   pages can produce false positives and false negatives.
6. Claim deletion counts are especially sensitive to scope mismatch: the
   April scrape can cover a whole site while the later crawl may cover only a
   homepage. A missing sentence in that comparison is not proof that it was
   deleted from the site.
7. Absence of evidence in this bundle is represented as unknown or absent; it
   must not be smoothed over for narrative clarity.
