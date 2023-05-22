# lint-diff-branch

CLI tool to run eslint against target branch

## Usage

```bash
lint-diff-branch TARGET_BRANCH_NAME # default to master or main
```

## Options

```bash
--source # Source branch, when not provided, it will be current local branch (returned by `git rev-parse --abbrev-ref HEAD`)
--head # Compare HEAD (instead of the source branch) against the target branch to determine the changed files. When provided, --source will be ignored. Recommended to enable when in detached HEAD mode (e.g. in CI)
--fix # Auto-fix the issues, when provided, it will run eslint --fix under the hood
--quiet # Only lint "error" issues, when provided, it will run eslint --quiet under the hood
--disablePrompt # will not ask user's confirmation before running eslint
--debug # Turn on debug mode, print extra information for debug purpose
```
