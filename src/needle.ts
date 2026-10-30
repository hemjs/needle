import type {
  ClassProvider,
  Container,
  ExistingProvider,
  Factory,
  FactoryProvider,
  Lifetime,
  Provider,
  ProviderToken,
  ValueProvider,
} from '@armscye/container';
import type { NoArgument, Type } from '@armscye/core';

import {
  CircularAliasError,
  CircularDependencyError,
  InvalidClassError,
  InvalidConstructorError,
  InvalidFactoryError,
  InvalidProviderError,
  ProviderConflictError,
  ProviderNotFoundError,
  ServiceNotCreatedError,
} from './errors.js';
import type { NeedleOptions } from './types.js';

interface ValueRecord {
  kind: 'value';
  value: unknown;
}

interface AliasRecord {
  kind: 'alias';
  target: ProviderToken;
}

interface FactoryRecord {
  kind: 'factory';
  factory: Factory;
  lifetime: Lifetime;
  instance?: { value: unknown };
}

type ProviderRecord = ValueRecord | AliasRecord | FactoryRecord;

export class Needle implements Container {
  readonly #records = new Map<ProviderToken, ProviderRecord>();
  readonly #path = new Set<ProviderToken>();
  readonly #options: NeedleOptions;

  constructor(providers: Provider[] = [], options: NeedleOptions = {}) {
    this.#options = options;

    for (const [index, provider] of providers.entries()) {
      this.#register(provider, index);
    }

    for (const provider of providers) {
      if (isExistingProvider(provider)) {
        this.#getAlias(provider.provide);
      }
    }
  }

  get<T>(token: ProviderToken): T {
    const target = this.#getAlias(token);
    const record = this.#records.get(target);

    switch (record?.kind) {
      case 'value':
        return record.value as T;
      case 'factory':
        return this.#getOrCreate(target, record) as T;
      default:
        throw new ProviderNotFoundError(target);
    }
  }

  has(token: ProviderToken): boolean {
    return this.#records.has(this.#getAlias(token));
  }

  addProvider(provider: Provider): this {
    if (!isExistingProvider(provider)) {
      this.#register(provider);
      return this;
    }

    const previous = this.#records.get(provider.provide);
    if (!this.#register(provider)) {
      return this;
    }
    try {
      this.#getAlias(provider.provide);
    } catch (error) {
      if (previous === undefined) {
        this.#records.delete(provider.provide);
      } else {
        this.#records.set(provider.provide, previous);
      }
      throw error;
    }
    return this;
  }

  #register(provider: Provider, index?: number): boolean {
    const record = this.#toRecord(provider, index);

    if (this.#records.has(provider.provide)) {
      switch (this.#options.conflictPolicy ?? 'override') {
        case 'error':
          throw new ProviderConflictError(provider.provide, index);
        case 'ignore':
          return false;
      }
    }

    this.#records.set(provider.provide, record);
    return true;
  }

  #toRecord(provider: Provider, index?: number): ProviderRecord {
    if (isValueProvider(provider)) {
      return { kind: 'value', value: provider.useValue };
    }
    if (isClassProvider(provider)) {
      return {
        kind: 'factory',
        factory: classToFactory(provider.useClass),
        lifetime: provider.lifetime ?? this.#options.lifetime ?? 'singleton',
      };
    }
    if (isFactoryProvider(provider)) {
      if (typeof provider.useFactory !== 'function') {
        throw new InvalidFactoryError(provider.useFactory, index);
      }
      return {
        kind: 'factory',
        factory: provider.useFactory,
        lifetime: provider.lifetime ?? this.#options.lifetime ?? 'singleton',
      };
    }
    if (isExistingProvider(provider)) {
      return { kind: 'alias', target: provider.useExisting };
    }
    throw new InvalidProviderError(provider, index);
  }

  #getAlias(token: ProviderToken): ProviderToken {
    let record = this.#records.get(token);
    if (record?.kind !== 'alias') {
      return token;
    }

    const seen = new Set<ProviderToken>();
    let cursor = token;
    while (record?.kind === 'alias') {
      if (seen.has(cursor)) {
        const path = [...seen];
        throw new CircularAliasError([
          ...path.slice(path.indexOf(cursor)),
          cursor,
        ]);
      }
      seen.add(cursor);
      cursor = record.target;
      record = this.#records.get(cursor);
    }
    return cursor;
  }

  #getOrCreate(token: ProviderToken, record: FactoryRecord) {
    if (record.instance) {
      return record.instance.value;
    }

    if (this.#path.has(token)) {
      const path = [...this.#path];
      const cycle = path.slice(path.indexOf(token));
      throw new CircularDependencyError([...cycle, token]);
    }

    this.#path.add(token);
    let value: unknown;
    try {
      value = this.#build(record.factory);
    } finally {
      this.#path.delete(token);
    }

    if (record.lifetime === 'singleton') {
      record.instance = { value };
    }

    return value;
  }

  #build(factory: Factory): unknown {
    try {
      return factory(this);
    } catch (error) {
      if (
        error instanceof CircularDependencyError ||
        error instanceof ServiceNotCreatedError
      ) {
        throw error;
      }
      throw new ServiceNotCreatedError([...this.#path], error);
    }
  }
}

function isValueProvider(provider: Provider): provider is ValueProvider {
  return (
    typeof provider === 'object' && provider !== null && 'useValue' in provider
  );
}

function isClassProvider(provider: Provider): provider is ClassProvider {
  return !!(provider && (provider as ClassProvider).useClass);
}

function isFactoryProvider(provider: Provider): provider is FactoryProvider {
  return !!(provider && (provider as FactoryProvider).useFactory);
}

function isExistingProvider(provider: Provider): provider is ExistingProvider {
  return !!(provider && (provider as ExistingProvider).useExisting);
}

function classToFactory(type: NoArgument<any>): Factory {
  if (!isInstantiable(type)) {
    throw new InvalidClassError(type);
  }
  if (type.length > 0) {
    throw new InvalidConstructorError(type);
  }
  return () => new (type as Type<any>)();
}

function isInstantiable(type: Type<any>): boolean {
  return typeof type === 'function' && typeof type.prototype !== 'undefined';
}
