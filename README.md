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

## Requirements

`nsc` authenticates workloads by talking to GitHub's OIDC Token endpoint.
Please ensure to grant `id-token: write` for your workflow (see [example](#example)).
