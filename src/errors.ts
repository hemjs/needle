import { ProviderToken } from '@armscye/container';

import { isPlainObject, stringify } from './utils';

export class NeedleError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class CyclicAliasError extends NeedleError {
  constructor(
    alias: ProviderToken,
    aliases: Map<
      ProviderToken,
      {
        token: any;
        shared?: boolean;
      }
    >,
  ) {
    let cycle = stringify(alias);
    let cursor = alias;

    while (aliases.has(cursor) && aliases.get(cursor)?.token !== alias) {
      cursor = aliases.get(cursor)?.token;
      cycle += ' -> ' + stringify(cursor);
    }

    cycle += ' -> ' + stringify(alias) + '\n';

    super(CYCLIC_ALIAS`${cycle}`);
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
  constructor(token: ProviderToken, message: string) {
    super(SERVICE_NOT_CREATED(stringify(token), message));
  }
}

const CYCLIC_ALIAS = (text: TemplateStringsArray, cycle: string) =>
  `Cycle detected within the aliases definitions:\n ${cycle}`;

export const INVALID_CLASS = (text: TemplateStringsArray, name: string) =>
  `Unable to instantiate class (${name} is not constructable).`;

const INVALID_CONSTRUCTOR = (text: TemplateStringsArray, name: string) =>
  `Invalid class constructor "${name}"; expected a defult (no-argument) constructor.`;

const INVALID_FACTORY = (text: TemplateStringsArray, value: string) =>
  `Invalid factory provided; expected a function, but "${value}" was received.`;

const PROVIDER_NOT_FOUND = (text: TemplateStringsArray, token: string) =>
  `No provider for "${token}" was found; are you certain you provided it during configuration?`;

const INVALID_PROVIDER = (text: TemplateStringsArray, detail: string) =>
  `Invalid provider definition detected; only instances of Provider are allowed, got: [${detail}].`;

const SERVICE_NOT_CREATED = (token: string, message: string) => {
  return `Service for "${token}" could not be created. Reason: ${message}`;
};
