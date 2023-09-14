# Setup AWS

This action setup AWS configurations along with AWS CLI if not installed in the runners.

## Usage

```yaml
- uses: benzene-tech/setup-aws@v1
  with:
    # AWS Region, e.g. us-east-2
    aws-region: ''
```

## Scenarios

- [Install latest version](#install-aws-cli)

### Install AWS CLI

```yaml
- uses: benzene-tech/setup-aws@v1
  with:
    aws-region: ap-south-1
```
