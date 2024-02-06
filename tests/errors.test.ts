import { NeedleError } from '../src/errors';

describe('NeedleError', () => {
  it('Error', () => {
    const message = 'Error message';
    expect(new NeedleError(message).message).toEqual(message);
  });
});
