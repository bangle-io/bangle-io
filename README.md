# bangle-io

The repository is divided into multiple smaller packages. Each package build
on top of expectations on its dependencies. For example it is not a allowed
that ui-components library imports workspace package, since the goal of that
library is to provide dumb UI components.
