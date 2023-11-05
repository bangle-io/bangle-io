## Inline Scripts

Scripts are bundled into one file using tsup and put into the public directory for Vite to inline it to the index.html file.
Ensure that scripts are lean and do not end up inline entire libraries.

## Usage

Avoid putting extra things in inline scripts as it is hard to debug, only critical things that benefit from being loaded before everything like theme type and widescreen.