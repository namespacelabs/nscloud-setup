# Set up Namespace Cloud CLI

This repository hosts a GitHub action that installs and configures
the [Namespace Cloud](https://cloud.namespace.so) CLI `nsc` in your workflow.

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
      - name: Install and configure Namespace Cloud CLI
        uses: namespacelabs/nscloud-setup@v0.0.1
      - name: Create an ephemeral cluster
        run: |
          nsc cluster create
```

## Requirements

`nsc` authenticates workloads by talking to GitHub's OIDC Token endpoint.
Please ensure to grant `id-token: write` for your workflow (see [example](#example)).
