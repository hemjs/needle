import type { ProviderToken } from '@armscye/container';

import { stringify } from './utils.js';

export class NeedleError extends Error {
  static {
    setName(this, 'NeedleError');
  }
}

export class CircularAliasError extends NeedleError {
  static {
    setName(this, 'CircularAliasError');
  }

  constructor(path: ProviderToken[]) {
    super(CIRCULAR_ALIAS(path.map(stringify).join(' -> ')));
  }
}

export class CircularDependencyError extends NeedleError {
  static {
    setName(this, 'CircularDependencyError');
  }

  constructor(path: ProviderToken[]) {
    super(CIRCULAR_DEPENDENCY(path.map(stringify).join(' -> ')));
  }
}

export class InvalidClassError extends NeedleError {
  static {
    setName(this, 'InvalidClassError');
  }

  constructor(value: unknown) {
    super(INVALID_CLASS(stringify(value)));
  }
}

export class InvalidConstructorError extends NeedleError {
  static {
    setName(this, 'InvalidConstructorError');
  }

  constructor(value: unknown) {
    super(INVALID_CONSTRUCTOR(stringify(value)));
  }
}

export class InvalidFactoryError extends NeedleError {
  static {
    setName(this, 'InvalidFactoryError');
  }

  constructor(value: unknown, index?: number) {
    super(INVALID_FACTORY(typeof value, atIndex(index)));
  }
}

export class InvalidOptionError extends NeedleError {
  static {
    setName(this, 'InvalidOptionError');
  }

  constructor(
    option: string,
    value: unknown,
    expected: readonly string[],
    index?: number,
  ) {
    super(INVALID_OPTION(option, stringify(value), expected, atIndex(index)));
  }
}

export class ProviderNotFoundError extends NeedleError {
  static {
    setName(this, 'ProviderNotFoundError');
  }

  constructor(token: ProviderToken) {
    super(PROVIDER_NOT_FOUND(stringify(token)));
  }
}

export class ProviderConflictError extends NeedleError {
  static {
    setName(this, 'ProviderConflictError');
  }

  constructor(token: ProviderToken, index?: number) {
    const location =
      index === undefined ? '' : `; conflicting provider${atIndex(index)}`;
    super(PROVIDER_CONFLICT(stringify(token), location));
  }
}

export class InvalidProviderError extends NeedleError {
  static {
    setName(this, 'InvalidProviderError');
  }

  constructor(value: unknown, index?: number) {
    super(INVALID_PROVIDER(stringify(value), atIndex(index)));
  }
}

export class ServiceNotCreatedError extends NeedleError {
  static {
    setName(this, 'ServiceNotCreatedError');
  }

  constructor(path: ProviderToken[], cause: unknown) {
    const token = stringify(path[path.length - 1]);
    const route =
      path.length > 1 ? ` (${path.map(stringify).join(' -> ')})` : '';
    const reason = cause instanceof Error ? cause.message : String(cause);
    super(SERVICE_NOT_CREATED(token, route, reason), { cause });
  }
}

const CIRCULAR_ALIAS = (cycle: string) => `Circular alias detected: ${cycle}`;

const CIRCULAR_DEPENDENCY = (cycle: string) =>
  `Circular dependency detected: ${cycle}`;

const INVALID_CLASS = (name: string) =>
  `Unable to instantiate class (${name} is not instantiable).`;

const INVALID_CONSTRUCTOR = (name: string) =>
  `Invalid class constructor "${name}"; expected a default (no-argument) constructor.`;

const INVALID_FACTORY = (type: string, location: string) =>
  `Invalid factory provided; expected a function, but "${type}" was received${location}.`;

const INVALID_OPTION = (
  option: string,
  value: string,
  expected: readonly string[],
  location: string,
) =>
  `Invalid ${option} "${value}"; expected one of ${expected.map((item) => `"${item}"`).join(', ')}${location}.`;

const PROVIDER_NOT_FOUND = (token: string) =>
  `No provider for "${token}" was found; are you certain you provided it during configuration?`;

const PROVIDER_CONFLICT = (token: string, location: string) =>
  `A provider for "${token}" is already registered${location}.`;

const INVALID_PROVIDER = (detail: string, location: string) =>
  `Invalid provider definition detected; only instances of Provider are allowed, got: [${detail}]${location}.`;

const SERVICE_NOT_CREATED = (token: string, route: string, reason: string) =>
  `Service for "${token}" could not be created${route}. Reason: ${reason}`;

// Locates a provider in the constructor's list, for messages.
function atIndex(index?: number): string {
  return index === undefined ? '' : ` at index ${index}`;
}

function setName(type: { prototype: Error }, name: string): void {
  Object.defineProperty(type.prototype, 'name', {
    value: name,
    writable: true,
    configurable: true,
  });
}
