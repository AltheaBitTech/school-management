import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { act } from 'react';

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

if (!React.act) {
  (React as typeof React & { act: typeof act }).act = act;
}
