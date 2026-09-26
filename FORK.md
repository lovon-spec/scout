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

## Branches

| Branch                                                      | What it is                                                                    |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `upstream/1-submission-checks` … `upstream/4-notifications` | The changes proposed to kleros/scout, one pull request each                   |
| `fork`                                                      | `upstream/4-notifications` plus the Community Scout commits. **Deploy this.** |
| `lab`                                                       | `fork` plus the notification lab, for test deployments only                   |

Changes go into the lowest upstream branch they belong to. The branches above are then rebased onto it: `git rebase --update-refs --onto <new> <old> lab`.

## Deploying on Netlify

Base directory `websites/app`. `netlify.toml` sets the build, Node 20.18.3 and the functions.

The app's build needs:

| Variable                                            |                                                                                                                                                                                            |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `REACT_APP_SUBGRAPH_GNOSIS_ENDPOINT`                | Scout's Envio indexer. The public endpoint is Kleros's; tell them, or run your own.                                                                                                        |
| `REACT_APP_SUBGRAPH_KLEROS_DISPLAY_GNOSIS_ENDPOINT` | The Kleros Display subgraph on The Graph's network, with an API key of your own: `https://gateway.thegraph.com/api/<key>/subgraphs/id/FxhLntVBELrZ4t1c2HNNvLWEYfBjpB8iKZiEymuFSPSr`        |
| `WALLETCONNECT_PROJECT_ID`                          | Your own Reown project, with your domain allowed.                                                                                                                                          |
| `ALCHEMY_API_KEY`                                   | Optional. Your own key.                                                                                                                                                                    |
| `REACT_APP_DAPPLOOKER_API_KEY`                      | Optional. Leave it out to hide the statistics.                                                                                                                                             |
| `REACT_APP_IPFS_CHECK_GATEWAY`                      | Optional. Before sending a transaction, the app checks that an upload can be fetched. It uses `https://cdn.kleros.link` by default; a dedicated Pinata gateway serves new uploads at once. |

The functions (notifications and uploads) need the variables in `netlify/notify/README.md`, plus:

| Variable     |                                                                           |
| ------------ | ------------------------------------------------------------------------- |
| `PINATA_JWT` | A Pinata API key allowed to upload files. Without it, uploads answer 503. |

Kleros-hosted read services remain in use: the Envio indexer endpoint above, `cdn.kleros.link` for reading IPFS content, and `rewards.kleros.io`.

## Licence

Kleros Scout's `websites/app/package.json` declares the MIT licence. Keep the credit to Kleros Scout.
