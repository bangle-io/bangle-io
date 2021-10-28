

% Enforces the repository field for all public workspaces while removing it from private workspaces
gen_enforced_field(WorkspaceCwd, 'repository.type', 'git') :-
  \+ workspace_field(WorkspaceCwd, 'private', true).
gen_enforced_field(WorkspaceCwd, 'repository.url', 'https://github.com/bangle-io/bangle-io.git') :-
  \+ workspace_field(WorkspaceCwd, 'private', true).
gen_enforced_field(WorkspaceCwd, 'repository.directory', WorkspaceCwd) :-
  \+ workspace_field(WorkspaceCwd, 'private', true).
gen_enforced_field(WorkspaceCwd, 'repository', null) :-
  workspace_field(WorkspaceCwd, 'private', true).

% Enforces that a dependency doesn't appear in both `dependencies` and `devDependencies`
gen_enforced_dependency(WorkspaceCwd, DependencyIdent, null, 'devDependencies') :-
  workspace_has_dependency(WorkspaceCwd, DependencyIdent, _, 'devDependencies'),
  workspace_has_dependency(WorkspaceCwd, DependencyIdent, _, 'dependencies').

% This rule will enforce that a workspace MUST depend on the same version of a dependency as the one used by the other workspaces
gen_enforced_dependency(WorkspaceCwd, DependencyIdent, DependencyRange2, DependencyType) :-
  % Iterates over all dependencies from all workspaces
    workspace_has_dependency(WorkspaceCwd, DependencyIdent, DependencyRange, DependencyType),
  % Iterates over similarly-named dependencies from all workspaces (again)
    workspace_has_dependency(OtherWorkspaceCwd, DependencyIdent, DependencyRange2, DependencyType2),
  % Ignore peer dependencies
    DependencyType \= 'peerDependencies',
    DependencyType2 \= 'peerDependencies',
  % Ignore devDependencies on other workspaces
    (
      (DependencyType = 'devDependencies'; DependencyType2 = 'devDependencies') ->
        \+ workspace_ident(DependencyCwd, DependencyIdent)
      ;
        true
    ).
