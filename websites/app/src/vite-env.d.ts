/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly REACT_APP_DAPPLOOKER_API_KEY: string;
  readonly REACT_APP_SUBGRAPH_GNOSIS_ENDPOINT: string;
  readonly REACT_APP_SUBGRAPH_KLEROS_DISPLAY_GNOSIS_ENDPOINT: string;
  readonly REACT_APP_ATLAS_URI: string;
  readonly REACT_APP_IPFS_CHECK_GATEWAY?: string;
  readonly REACT_APP_COMMIT_SHA?: string;
  readonly REACT_APP_SOURCE_REPO?: string;
  readonly REACT_APP_BUILD_RUN_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}