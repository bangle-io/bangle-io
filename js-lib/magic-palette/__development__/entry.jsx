import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { MagicPaletteDriver } from './MagicPaletteDriver';

const root = document.getElementById('root');

ReactDOM.render(
  <div>
    <MagicPaletteDriver />
  </div>,
  root,
);
