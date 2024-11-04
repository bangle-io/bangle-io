jq -r '.scripts | keys[] | select(endswith(":ci"))' package.json | \
xargs -n1 -I{} sh -c 'echo "----------------------------------------"; \
echo "Running script: {}"; \
pnpm run {}'