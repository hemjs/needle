import type { ProviderToken } from '@armscye/container';

import { stringify } from './utils.js';

export class NeedleError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

export class CircularAliasError extends NeedleError {
  constructor(path: ProviderToken[]) {
    super(CIRCULAR_ALIAS(path.map(stringify).join(' -> ')));
  }
}

export class CircularDependencyError extends NeedleError {
  constructor(path: ProviderToken[]) {
    super(CIRCULAR_DEPENDENCY(path.map(stringify).join(' -> ')));
  }
}

export class InvalidClassError extends NeedleError {
  constructor(value: unknown) {
    super(INVALID_CLASS(stringify(value)));
  }
}

export class InvalidConstructorError extends NeedleError {
  constructor(value: unknown) {
    super(INVALID_CONSTRUCTOR(stringify(value)));
  }
}

export class InvalidFactoryError extends NeedleError {
  constructor(value: unknown, index?: number) {
    super(INVALID_FACTORY(typeof value, atIndex(index)));
  }
}

export class ProviderNotFoundError extends NeedleError {
  constructor(token: ProviderToken) {
    super(PROVIDER_NOT_FOUND(stringify(token)));
  }
}

export class ProviderConflictError extends NeedleError {
  constructor(token: ProviderToken, index?: number) {
    const location =
      index === undefined ? '' : `; conflicting provider${atIndex(index)}`;
    super(PROVIDER_CONFLICT(stringify(token), location));
  }
}

export class InvalidProviderError extends NeedleError {
  constructor(value: unknown, index?: number) {
    super(INVALID_PROVIDER(stringify(value), atIndex(index)));
  }
}

export class ServiceNotCreatedError extends NeedleError {
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
