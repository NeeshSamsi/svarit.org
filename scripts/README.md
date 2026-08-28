# Prismic migration scripts

Moves `src/data/content.json` into the Prismic repository `svarit`, using the Migration API
from `@prismicio/client`.

Dry run is the default. Writing needs an explicit `--commit`, and `--commit` takes a full
repository backup first and aborts if that backup fails.

## Hard prerequisite: push the custom types first

**The custom types must exist in the Prismic repository before the migration runs.** The
Migration API cannot create a document for a type that is not there, and it will not create
the type for you. Push them with Slice Machine:

```sh
pnpm slicemachine
```

Open the local Slice Machine UI, then push `page`, `event`, `artist`, `volunteer`, `settings`
and every slice. Confirm in the Prismic dashboard that the types are listed before going any
further. A `settings` document must also exist and be published, because the migration merges
the footer copy into it rather than creating it.

## Getting a write token

1. Open `https://svarit.prismic.io/settings/apps/`, or in the dashboard go to
   **Settings → API & Security → Write API**.
2. Generate a token. Copy it once, it is not shown again.
3. Put it in `.env.local`, which every script here loads automatically:

```sh
PRISMIC_WRITE_TOKEN=your-token-here
```

Or pass it inline for a single run:

```sh
PRISMIC_WRITE_TOKEN=... pnpm migrate:commit
```

The dry run and the backup work without a token on a publicly readable repository. The
migration refuses to run with `--commit` when the token is missing.

## Run order

```sh
# 1. Back up everything that is already in Prismic.
pnpm backup

# 2. Parse artist names out of the event descriptions.
pnpm extract:artists

# 3. Review scripts/artists.draft.json BY HAND, then set "approved": true.

# 4. Dry run. Writes nothing, prints the plan, saves scripts/migration-preview.json.
pnpm migrate:preview
pnpm migrate:preview --with-artists

# 5. Commit. Backs up first, writes, then verifies.
pnpm migrate:commit
pnpm migrate:commit --with-artists

# 6. Open Prismic, review the migration release, publish it.
```

Run the tests whenever you touch the mapping code:

```sh
pnpm test
```

## The backup guarantee

`scripts/backup-prismic.ts` reads every document of every type on the master ref, paginated,
and writes:

- `backups/prismic-<timestamp>.json` — the full dump, with the ref it was taken from
- `backups/latest.json` — a pointer to the newest dump

`pnpm migrate:commit` runs the same backup as its first step. **If the backup fails for any
reason, the migration aborts and nothing is written.** The backup path is printed again in
the failure output of a partial migration, so there is always something to restore from.

`backups/` is gitignored.

## What gets created

| Type                 | Count         | Source                                                                              |
| -------------------- | ------------- | ----------------------------------------------------------------------------------- |
| `page` uid `home`    | 1             | hero, sponsors, about, event_list (default), donate, contact slices                 |
| `page` uid `events`  | 1             | one `event_list` slice, `grid` variation                                            |
| `page` uid `artists` | 1             | one `artist_list` slice                                                             |
| `event`              | 24            | `initiatives.events` (category Event) + `initiatives.workshops` (category Workshop) |
| `volunteer`          | 6             | `volunteers`                                                                        |
| `artist`             | 36 candidates | only with `--with-artists`, only from an approved draft                             |
| `settings`           | updated       | footer copy merged in, plus two forced overwrites (see below)                       |

Plus 20 assets uploaded to the media library from `public/assets`.

## Safety properties

- **Dry run by default.** `--commit` is the only thing that writes.
- **Backup first.** No backup, no write.
- **Idempotent.** Before planning anything the script queries every ref, including
  unpublished release refs, and skips any document whose uid is already there. Re-running
  never duplicates. Assets for a skipped page are not re-uploaded either.
- **Verified afterwards.** After a commit run the repository is re-queried and the created
  documents are counted against the plan. Any drift is printed loudly and exits non-zero.
- **Non-destructive settings merge, with two documented exceptions.** Fields that already
  have content in Prismic are never overwritten. Only empty ones are filled. See below for
  the two fields that deliberately break this rule.
- **Nothing is published.** Documents land in the Prismic migration release. Review and
  publish them by hand.

### The two forced settings overwrites

The settings document in Prismic holds two values that are stale rather than newer, so the
user approved overwriting them. Both are printed as warnings on every run.

| Field            | Overwritten from                           | Overwritten to                      | Why                                                                                                |
| ---------------- | ------------------------------------------ | ----------------------------------- | -------------------------------------------------------------------------------------------------- |
| `footer.contact` | `svarittrust1@gmail.com \| +91 9930759942` | `team@svarit.org \| +91 9930759942` | The address changed in commit `0ccadaa`, and Prismic was never updated.                            |
| `donationLink`   | `https://rzp.io/l/svarit`                  | `https://pages.razorpay.com/svarit` | The live Donate button uses the pages.razorpay.com URL. It is now the one donation URL everywhere. |

`donationLink` is a repeatable Link field. Only the `url` on each entry is replaced, so the
link text, target and key survive. `footer.copyright` and `footer.credits` stay conservative
and are only filled when empty.

### Other content decisions baked into the migration

- **Hero CTA.** `content.json` has `hero.cta: "Explore Initiatives"`, but that string was
  never rendered. `Hero.tsx` shows "Learn more" pointing at `#about`, and the rendered
  version wins, so `hero.cta_label` and `hero.cta_link` migrate as "Learn more" and `#about`.
- **`/events` and `/artists` copy** was drafted for the migration and approved by the user.
  `content.json` has no copy for either index page.
- **Alt text.** The Sponsors, About and Volunteers slices render images with
  `fallbackAlt=""`, so alt text has to come from the asset. Sponsor logos upload as
  `<Name> logo` and volunteer photos as `<Name>, Svarit volunteer`. Hero and donate
  images stay decorative, matching the current markup.

## Files

| File                     | What it is                                                             |
| ------------------------ | ---------------------------------------------------------------------- |
| `backup-prismic.ts`      | CLI: dump the whole repository                                         |
| `migrate-to-prismic.ts`  | CLI: plan, and optionally write, the migration                         |
| `extract-artists.ts`     | CLI: parse artist names into a reviewable draft                        |
| `lib/backup.ts`          | the backup itself, reused by the migration                             |
| `lib/transform.ts`       | pure mapping helpers (slugify, uids, rich text, dates, settings merge) |
| `lib/artists.ts`         | pure honorific and artist name extraction                              |
| `lib/assets.ts`          | registers `public/` files as Prismic assets, deduplicated              |
| `lib/content.ts`         | the shape of `content.json`                                            |
| `lib/prismic.ts`         | client construction                                                    |
| `lib/paths.ts`           | shared filesystem locations                                            |
| `*.test.ts`              | `node:test` coverage of the pure functions                             |
| `artists.draft.json`     | generated, then edited by hand, then approved                          |
| `migration-preview.json` | generated by every dry run                                             |

## Artists need a human pass

`content.json` has no artist records. Names exist only inside event description prose, for
example "vocal recitals by Pt. Dinkar Kaikini, Smt Aditi Kaikini Upadhya". `extract-artists.ts`
parses them out and writes candidates to `scripts/artists.draft.json` with honorifics split
into their own field, a guessed discipline, and the events each name appeared in.

It is a draft. It gets things wrong. Each candidate carries a `review` array flagging what to
check: probable misspellings of another entry ("Chakraborty" vs "Chakrabarty"), short forms of
the same person ("Aditi Upadhya" vs "Aditi Kaikini Upadhya"), names captured without a
surname, and names with no honorific to anchor on.

Nothing is written to Prismic until the file has top-level `"approved": true` **and** the
migration is run with `--with-artists`. The `artist` custom type has no honorific field, so
the honorific is kept in the draft for reference only and is not migrated.

## Running the scripts directly

The npm scripts wrap `node --experimental-strip-types`, which runs the TypeScript without a
build step or an extra dependency. To pass flags not covered by a script:

```sh
node --env-file-if-exists=.env.local --experimental-strip-types \
  scripts/migrate-to-prismic.ts --commit --with-artists
```
