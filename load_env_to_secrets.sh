#!/bin/bash

REPO=$(git config --get remote.origin.url | sed -e 's/git@github.com://' -e 's/https:\/\/github.com\///' -e 's/\.git//')

if [ -z "$REPO" ]; then
    echo "ERROR: Could not detect GitHub repository. Specify manually in the script."
    exit 1
fi

echo "--- Syncing local .env to GitHub Secrets for $REPO ---"

if ! command -v gh &> /dev/null; then
    echo "ERROR: GitHub CLI (gh) is not installed."
    exit 1
fi

if ! gh auth status &> /dev/null; then
    echo "ERROR: GitHub CLI (gh) is not authenticated. Run 'gh auth login' first."
    exit 1
fi

# 1. Read .env and sync variables
while IFS='=' read -r key value; do
    # Skip comments and empty lines
    [[ "$key" =~ ^#.*$ ]] && continue
    [[ -z "$key" ]] && continue
    
    # Trim whitespace
    key=$(echo "$key" | xargs)
    value=$(echo "$value" | xargs)

    # Skip GitHub reserved names
    if [[ "$key" == GITHUB_* ]]; then
        echo "Skipping $key (reserved name)..."
        continue
    fi

    echo "Syncing $key..."
    echo -n "$value" | gh secret set "$key" --repo "$REPO"
done < .env

echo "All secrets synced to GitHub!"
