# Configure access to Namespace

This repository hosts a GitHub action that configures access to Namespace.
It also installs the [Namespace Cloud](https://cloud.namespace.so) CLI `nsc` in your workflow.

## Example

```yaml
jobs:
  deploy:
    name: Ephemeral cluster
    runs-on: ubuntu-latest
    # These permissions are needed to interact with GitHub's OIDC Token endpoint.
    permissions:
      id-token: write
      contents: read
    steps:
      - name: Checkout
        uses: actions/checkout@v3
      - name: Configure access to Namespace
        uses: namespacelabs/nscloud-setup@v0
      - name: Create an ephemeral cluster
        run: |
          nsc cluster create
```

### Using Namespace GitHub Runners

[Namespace GitHub Runners](https://cloud.namespace.so/docs/features/faster-github-actions) are already authenticated with Namespace.
Hence, no token exchange is needed and `id-token: write` permissions can be skipped.

```yaml
jobs:
  deploy:
    name: Ephemeral cluster
    runs-on: nscloud
    permissions:
      contents: read
    steps:
      - name: Checkout
        uses: actions/checkout@v3
      - name: Configure access to Namespace
        uses: namespacelabs/nscloud-setup@v0
      - name: Create an ephemeral cluster
        run: |
          nsc cluster create
```

## Requirements

`nsc` authenticates workloads by talking to GitHub's OIDC Token endpoint.
Please ensure to grant `id-token: write` for your workflow (see [example](#example)).

When [Namespace GitHub Runners](https://cloud.namespace.so/docs/features/faster-github-actions) are used, no token exchange is needed and `id-token: write` permissions can be skipped (see [example](#using-namespace-github-runners)).
