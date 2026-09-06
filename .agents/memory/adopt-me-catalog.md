---
name: Adopt Me catalog rules
description: Durable behavior for the Adopt Me value catalog and mutation records.
---

Adopt Me values are seeded from the uploaded source list as separate item records for each pet and mutation. Seeding must only create missing records, never overwrite Admin-managed values or image URLs.

**Why:** Base, potion, neon, and mega variants need independent images and values; sharing a record causes an image edit for one mutation to leak into the others.

**How to apply:** Keep values-page grouping based on the mutation prefix, and update catalog records by their individual database ID.