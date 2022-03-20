const { walkWorkspace } = require('./map-files');

const capitalize = (str) => {
  const c = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  return str
    .split('-')
    .map((r) => c(r))
    .join('');
};

async function main() {
  const workspaces = await walkWorkspace();
  const workspaceNames = workspaces.map((r) => r.name);
  const depGraph = {};
  for (const w of workspaces) {
    const { name, packageJSON } = w;
    depGraph[name] = [];
    Object.keys(packageJSON.dependencies || {}).forEach((dep) => {
      if (workspaceNames.includes(dep)) {
        depGraph[name].push({ name: dep, type: 'regular' });
      }
    });

    Object.keys(packageJSON.devDependencies || {}).forEach((dep) => {
      if (workspaceNames.includes(dep)) {
        depGraph[name].push({ name: dep, type: 'dev' });
      }
    });
  }
  const mermaidList = [`stateDiagram-v2`];
  for (const [name, deps] of Object.entries(depGraph)) {
    for (const dep of deps) {
      const connector = dep.type === 'regular' ? '-->' : '-->';
      mermaidList.push(
        `    ${capitalize(name)} ${connector} ${capitalize(dep.name)}`,
      );
    }
  }
  console.log(mermaidList.join('\n'));
}

main();
