import { runInNewContext } from 'node:vm';

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

describe('ServiceNotCreatedError', () => {
  const reasonOf = (cause: unknown) =>
    new ServiceNotCreatedError(['a'], cause).message.split('Reason: ')[1];

  it('should keep the cause', () => {
    const cause = Object.create(null);
    expect(new ServiceNotCreatedError(['a'], cause).cause).toBe(cause);
  });

  it.each([
    ['an Error', new Error('connection refused'), 'connection refused'],
    [
      'an error-like object',
      { message: 'connection refused' },
      'connection refused',
    ],
    [
      'an error from another realm',
      runInNewContext('new Error("connection refused")'),
      'connection refused',
    ],
    ['a non-string message', { message: 42 }, '42'],
    ['a string', 'boom', 'boom'],
    ['a symbol', Symbol('boom'), 'Symbol(boom)'],
    ['undefined', undefined, 'undefined'],
    [
      'a null-prototype object',
      Object.assign(Object.create(null), { code: 'ECONNREFUSED' }),
      '{"code":"ECONNREFUSED"}',
    ],
  ])('should describe %s', (_label, cause, reason) => {
    expect(reasonOf(cause)).toBe(reason);
  });

  it('should not throw for causes that cannot be read', () => {
    const throwingToString = {
      toString() {
        throw new Error('toString failed');
      },
    };
    const throwingMessage = new Error('x');
    Object.defineProperty(throwingMessage, 'message', {
      get() {
        throw new Error('getter failed');
      },
    });
    const { proxy, revoke } = Proxy.revocable({}, {});
    revoke();

    expect(reasonOf(throwingToString)).toBe('{"toString":"toString"}');
    expect(reasonOf(throwingMessage)).toBe('{}');
    expect(reasonOf(proxy)).toBe('[unserializable]');
  });
});
