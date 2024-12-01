// Import styles, initialize component theme here.
// import '../src/common.css';
import '@bangle.io/browser-entry/src/index.css';
import previewAnnotations from '@bangle.io/storybook/.storybook/preview';
import { setProjectAnnotations } from '@storybook/react';

setProjectAnnotations(previewAnnotations);
