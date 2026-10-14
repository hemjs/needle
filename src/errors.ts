import type { ProviderToken } from '@armscye/container';

import { isPlainObject, stringify } from './utils.js';

export class NeedleError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

export class CyclicAliasError extends NeedleError {
  constructor(
    alias: ProviderToken,
    aliases: Map<ProviderToken, ProviderToken>,
  ) {
    let cycle = stringify(alias);
    let cursor = alias;

    while (aliases.has(cursor) && aliases.get(cursor) !== alias) {
      cursor = aliases.get(cursor)!;
      cycle += ' -> ' + stringify(cursor);
    }

    cycle += ' -> ' + stringify(alias) + '\n';

    super(CYCLIC_ALIAS`${cycle}`);
  }
}

export class CyclicDependencyError extends NeedleError {
  constructor(path: ProviderToken[]) {
    super(CYCLIC_DEPENDENCY`${path.map(stringify).join(' -> ')}`);
  }
}

export class ProviderOverrideError extends NeedleError {
  constructor(token: ProviderToken) {
    super(PROVIDER_OVERRIDE`${stringify(token)}`);
  }
}

export class InvalidClassError extends NeedleError {
  constructor(value: any) {
    super(INVALID_CLASS`${stringify(value)}`);
  }
}

export class InvalidConstructorError extends NeedleError {
  constructor(value: any) {
    super(INVALID_CONSTRUCTOR`${stringify(value)}`);
  }
}

export class InvalidFactoryError extends NeedleError {
  constructor(value: any) {
    super(INVALID_FACTORY`${typeof value}`);
  }
}

export class ProviderNotFoundError extends NeedleError {
  constructor(token: ProviderToken) {
    super(PROVIDER_NOT_FOUND`${stringify(token)}`);
  }
}

export class InvalidProviderError extends NeedleError {
  constructor(value: any) {
    const detail = isPlainObject(value)
      ? JSON.stringify(value)
      : stringify(value);
    super(INVALID_PROVIDER`${detail}`);
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

const CYCLIC_ALIAS = (text: TemplateStringsArray, cycle: string) =>
  `Cycle detected within the aliases definitions:\n ${cycle}`;

const CYCLIC_DEPENDENCY = (text: TemplateStringsArray, path: string) =>
  `Circular dependency detected: ${path}`;

const PROVIDER_OVERRIDE = (text: TemplateStringsArray, token: string) =>
  `Cannot replace the provider for "${token}"; it has already been resolved. Pass { allowOverride: true } to allow this.`;

const INVALID_CLASS = (text: TemplateStringsArray, name: string) =>
  `Unable to instantiate class (${name} is not constructable).`;

const INVALID_CONSTRUCTOR = (text: TemplateStringsArray, name: string) =>
  `Invalid class constructor "${name}"; expected a default (no-argument) constructor.`;

const INVALID_FACTORY = (text: TemplateStringsArray, value: string) =>
  `Invalid factory provided; expected a function, but "${value}" was received.`;

const PROVIDER_NOT_FOUND = (text: TemplateStringsArray, token: string) =>
  `No provider for "${token}" was found; are you certain you provided it during configuration?`;

const INVALID_PROVIDER = (text: TemplateStringsArray, detail: string) =>
  `Invalid provider definition detected; only instances of Provider are allowed, got: [${detail}].`;

const SERVICE_NOT_CREATED = (token: string, route: string, reason: string) => {
  return `Service for "${token}" could not be created${route}. Reason: ${reason}`;
};
