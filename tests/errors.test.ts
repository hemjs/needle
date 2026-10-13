import { describe, expect, it } from 'vitest';

import { NeedleError } from '../src/errors.js';

describe('NeedleError', () => {
  it('Error', () => {
    const message = 'Error message';
    expect(new NeedleError(message).message).toEqual(message);
  });
});
