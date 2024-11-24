#!/bin/bash
# For vitest migration
# run codemod pnpm dlx vitest-codemod -t jest packages/js-lib/**/*.test.*
# move files to staging area
# run this script

set -e

# Function to display messages
function echo_info {
    echo -e "\033[1;34m[INFO]\033[0m $1"
}

function echo_error {
    echo -e "\033[1;31m[ERROR]\033[0m $1" >&2
}

# Ensure we're inside a Git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo_error "This script must be run inside a Git repository."
    exit 1
fi

# Get list of staged files
staged_files=$(git diff --cached --name-only)

# Initialize a flag to check if any files need renaming
rename_needed=false

# Iterate over each staged file
while IFS= read -r file; do
    if [[ "$file" == *".test."* ]]; then
        rename_needed=true
        # Construct the new filename by replacing '.test.' with '.spec.'
        new_file="${file//.test./.spec.}"
        
        # Check if the new file already exists to avoid overwriting
        if git ls-files --error-unmatch "$new_file" > /dev/null 2>&1; then
            echo_error "Cannot rename '$file' to '$new_file' because '$new_file' already exists in the repository."
            exit 1
        fi

        echo_info "Renaming '$file' to '$new_file'"

        # Perform the git move (rename)
        git mv "$file" "$new_file"

    fi
done <<< "$staged_files"

if [ "$rename_needed" = false ]; then
    echo_info "No staged files contain '.test.' in their filenames. No renaming needed."
else
    echo_info "Renaming completed successfully."
    echo_info "Don't forget to commit your changes."
fi
