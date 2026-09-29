# Community Scout

An independently operated community fork of [Kleros Scout](https://scout.kleros.io). It is not operated, endorsed or maintained by Coopérative Kleros.

## What differs from Kleros Scout

- **Branding:** its own name and wordmark, and an attribution in the footer. The terms of service say who does _not_ run it, and no longer name Kleros's sites or its choice of law.
- **Uploads:** Kleros Scout uploads the files of submissions and evidence through Kleros's Atlas service. Community Scout pins them with its own Pinata account instead, through `POST /api/notify/upload`.
  - `src/fork/atlas.tsx` stands in for `@kleros/kleros-app`, so the app code is unchanged.
  - Signing in uses the notification service's Sign-In with Ethereum session.
  - Each user may upload at most 30 files an hour and 50 MB a day.
- **Help:** Kleros's support channels (Telegram, bug tracker, feedback form) are for Kleros Scout, so the Help menu keeps only the guides.
- **Statistics:** the DappLooker key is optional; without it, the statistics are hidden.
- **Notification timing:** the watcher runs every 15 minutes instead of every minute, and delivery a minute after it, so the free Netlify plan's credits suffice. Alerts arrive up to about 16 minutes after the activity.

## Branches

| Branch                                                      | What it is                                                                    |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `upstream/1-submission-checks` … `upstream/4-notifications` | The changes proposed to kleros/scout, one pull request each                   |
| `fork`                                                      | `upstream/4-notifications` plus the Community Scout commits. **Deploy this.** |
| `lab`                                                       | `fork` plus the notification lab, for test deployments only                   |

Changes go into the lowest upstream branch they belong to. The branches above are then rebased onto it: `git rebase --update-refs --onto <new> <old> lab`.

## Deploying

Deploys run in public, from `.github/workflows/community-scout.yml` in lovon-spec/scout, on every push to `fork` that changes more than this file:

1. Install, test and build on Node 20.18.3.
2. Record signed build provenance for every file in `dist` (GitHub artifact attestations).
3. Deploy exactly those files, and the functions, to Netlify with the Netlify CLI.
4. Tag the deployed commit `deployed/<run id>`, so its source stays in the repository when `fork` is rebased onto newer upstream changes.

The footer links to the build a page came from.

**Checking a deployment:** download a file the site serves, such as its main script (`/assets/index-….js`, named in the page source), and run `gh attestation verify <file> --repo lovon-spec/scout`. It succeeds only for files this workflow built from a commit in that repository. Netlify's free plan edits HTML pages as it serves them, adding a comment and its "Powered by Netlify" badge script, so `index.html` itself won't match; the scripts and styles it loads are served unchanged.

Repository settings, under Secrets and variables → Actions:

| Secret               |                                                           |
| -------------------- | --------------------------------------------------------- |
| `NETLIFY_AUTH_TOKEN` | A Netlify personal access token that can deploy the site. |
| `NETLIFY_SITE_ID`    | The Netlify site's ID.                                    |

| Variable (these end up in the site's code, so they are public anyway) |                                                                                                                                                                                                                                                                                                                  |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `REACT_APP_SUBGRAPH_GNOSIS_ENDPOINT`                                  | Scout's Envio indexer. The public endpoint is Kleros's; tell them, or run your own.                                                                                                                                                                                                                              |
| `WALLETCONNECT_PROJECT_ID`                                            | Your own Reown project, with your domain allowed.                                                                                                                                                                                                                                                                |
| `REACT_APP_SUBGRAPH_KLEROS_DISPLAY_GNOSIS_ENDPOINT`                   | Optional. The Kleros Display subgraph on The Graph's network, with an API key of your own: `https://gateway.thegraph.com/api/<key>/subgraphs/id/FxhLntVBELrZ4t1c2HNNvLWEYfBjpB8iKZiEymuFSPSr`. Without it, the latest disputes and the solved-disputes figure are left out, and court periods are read on-chain. |
| `REACT_APP_IPFS_CHECK_GATEWAY`                                        | Optional. Before sending a transaction, the app checks that an upload can be fetched. It uses `https://cdn.kleros.link` by default; a dedicated Pinata gateway serves new uploads at once.                                                                                                                       |

The Netlify site doesn't build anything itself; turn its builds off. Its environment holds the functions' secrets: the variables in `netlify/notify/README.md`, a Postgres database as `NOTIFY_DATABASE_URL` (Community Scout uses a free Supabase project through its transaction pooler on port 6543, which has no compute-hours limit; its tables are closed to Supabase's Data API), and:

| Variable     |                                                                           |
| ------------ | ------------------------------------------------------------------------- |
| `PINATA_JWT` | A Pinata API key allowed to upload files. Without it, uploads answer 503. |

**On Supabase:** create the project in the region of the Netlify functions (us-east-2 by default) and use its transaction pooler string with `?sslmode=require`. Supabase publishes the `public` schema through its Data API, which the service doesn't use. Once the service has created its tables (its first request does), close them to the API's roles; the service's own role owns the tables and is unaffected:

```sql
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated, service_role;
alter default privileges for role postgres in schema public revoke all on functions from anon, authenticated, service_role;
revoke all on all tables in schema public from anon, authenticated, service_role;
revoke all on all sequences in schema public from anon, authenticated, service_role;
revoke all on all functions in schema public from anon, authenticated, service_role;
do $$ declare t record; begin for t in select tablename from pg_tables where schemaname = 'public' loop execute format('alter table public.%I enable row level security', t.tablename); end loop; end $$;
```

Kleros-hosted read services remain in use: the Envio indexer endpoint above, `cdn.kleros.link` for reading IPFS content, and `rewards.kleros.io`.

## Licence

Kleros Scout's `websites/app/package.json` declares the MIT licence. Keep the credit to Kleros Scout.
