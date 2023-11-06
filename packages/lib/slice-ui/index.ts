import { createKey } from '@nalanda/core';

import { COLOR_SCHEMA } from '@bangle.io/constants';

const key = createKey('slice-ui', []);

const widescreenField = key.field(
  !document.firstElementChild!.classList.contains('BU_smallscreen'),
);

const colorSchemeField = key.field(
  document.firstElementChild!.classList.contains('dark-scheme')
    ? COLOR_SCHEMA.DARK
    : COLOR_SCHEMA.LIGHT,
);

export const sliceUI = key.slice({
  widescreen: widescreenField,
  colorScheme: colorSchemeField,
});
