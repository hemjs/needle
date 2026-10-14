import { describe, expect, it } from 'vitest';

import { NeedleError } from '../src/errors.js';

describe('NeedleError', () => {
  it('Error', () => {
    const message = 'Error message';
    expect(new NeedleError(message).message).toEqual(message);
  });

  it('is named after its class', () => {
    expect(new NeedleError('Error message').name).toBe('NeedleError');
  });
});
