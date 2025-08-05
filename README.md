# Configure access to Namespace

This repository hosts a GitHub action that configures access to Namespace.
It also installs the [Namespace Cloud](https://cloud.namespace.so) CLI `nsc` in your workflow.

## Example with GitHub Runners

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

### Using Namespace Runners

Workflows using [Namespace-managed GitHub Runners](https://namespace.so/docs/solutions/github-actions) can typically skip `nscloud-setup`. They are already authenticated with Namespace. On Namespace runners, the action may still be useful to obtain the address of your [private container registry](https://namespace.so/docs/architecture/storage/container-registry).

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
        id: nscloud # Needed to access its outputs
        uses: namespacelabs/nscloud-setup@v0
        # Run standard Docker's build-push action
      - name: Build and push
        uses: docker/build-push-action@v4
        with:
          context: .
          push: true
          tags: ${{ steps.nscloud.outputs.registry-address }}/path/to/img:v1

```

## Requirements

`nsc` authenticates workloads by talking to GitHub's OIDC Token endpoint.
Please ensure to grant `id-token: write` for your workflow (see [example](#example)).

When [Namespace GitHub Runners](https://cloud.namespace.so/docs/features/faster-github-actions) are used, no token exchange is needed and `id-token: write` permissions can be skipped (see [example](#using-namespace-github-runners)).
