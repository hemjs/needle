import { describe, expect, it } from 'vitest';

import {
  CircularAliasError,
  CircularDependencyError,
  InvalidClassError,
  InvalidConstructorError,
  InvalidFactoryError,
  InvalidOptionError,
  InvalidProviderError,
  NeedleError,
  ProviderConflictError,
  ProviderNotFoundError,
  ServiceNotCreatedError,
} from '../src/errors.js';

describe('NeedleError', () => {
  it('Error', () => {
    const message = 'Error message';
    expect(new NeedleError(message).message).toEqual(message);
  });

  it('is named after its class', () => {
    expect(new NeedleError('Error message').name).toBe('NeedleError');
  });

  it.each([
    ['CircularAliasError', new CircularAliasError(['a'])],
    ['CircularDependencyError', new CircularDependencyError(['a'])],
    ['InvalidClassError', new InvalidClassError('a')],
    ['InvalidConstructorError', new InvalidConstructorError('a')],
    ['InvalidFactoryError', new InvalidFactoryError('a')],
    ['InvalidProviderError', new InvalidProviderError('a')],
    ['InvalidOptionError', new InvalidOptionError('a', 'b', ['c'])],
    ['ProviderConflictError', new ProviderConflictError('a')],
    ['ProviderNotFoundError', new ProviderNotFoundError('a')],
    ['ServiceNotCreatedError', new ServiceNotCreatedError(['a'], 'reason')],
  ])('should name %s and extend NeedleError', (name, error) => {
    expect(error).toBeInstanceOf(NeedleError);
    expect(error.name).toBe(name);
  });

  it('should keep its name in subclasses and minified builds', () => {
    // A minifier renames classes, so the name must not come from the class.
    const Renamed = class extends ProviderNotFoundError {};

    expect(new Renamed('a').name).toBe('ProviderNotFoundError');
  });

  it('should keep name off the error itself, as built-in errors do', () => {
    const error = new NeedleError('Error message');

    expect(Object.keys(error)).toEqual([]);
    expect(JSON.stringify(error)).toBe('{}');
    expect(
      Object.getOwnPropertyDescriptor(NeedleError.prototype, 'name'),
    ).toMatchObject({ enumerable: false, writable: true, configurable: true });
  });
});
