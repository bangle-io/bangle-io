failed_scripts=(); \
while read script; do \
    echo "----------------------------------------"; \
    echo "Running script: $script"; \
    if ! pnpm run "$script"; then \
        failed_scripts+=("$script"); \
    fi; \
done < <(jq -r '.scripts | keys[] | select(endswith(":ci"))' package.json); \
if [ ${#failed_scripts[@]} -ne 0 ]; then \
    echo "The following scripts failed:"; \
    for script in "${failed_scripts[@]}"; do \
        echo "- $script"; \
    done; \
    exit 1; \
else \
    echo "All scripts ran successfully."; \
fi
