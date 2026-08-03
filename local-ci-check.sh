#!/usr/bin/env bash

if ! ci_scripts="$(bun packages/tooling/custom-scripts/scripts/list-ci-scripts.ts package.json)"; then
    exit 1
fi

failed_scripts=()
while IFS= read -r script; do
    echo "----------------------------------------"
    echo "Running script: $script"
    if ! pnpm run "$script"; then
        failed_scripts+=("$script")
    fi
done <<< "$ci_scripts"

if [ ${#failed_scripts[@]} -ne 0 ]; then
    echo "The following scripts failed:"
    for script in "${failed_scripts[@]}"; do
        echo "- $script"
    done
    exit 1
fi

echo "All scripts ran successfully."
