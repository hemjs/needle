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
import type { NoArgument } from '@armscye/core';

import {
  CircularAliasError,
  CircularDependencyError,
  InvalidClassError,
  InvalidConstructorError,
  InvalidFactoryError,
  InvalidOptionError,
  InvalidProviderError,
  ProviderConflictError,
  ProviderNotFoundError,
  ServiceNotCreatedError,
} from './errors.js';
import type { ConflictPolicy, NeedleOptions } from './types.js';

const LIFETIMES: readonly Lifetime[] = ['singleton', 'transient'];
const CONFLICT_POLICIES: readonly ConflictPolicy[] = [
  'override',
  'error',
  'ignore',
];

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
    if (typeof options !== 'object' || options === null) {
      throw new InvalidOptionError('options', options, ['object']);
    }
    this.#options = { ...options };
    checkOption('lifetime', this.#options.lifetime, LIFETIMES);
    checkOption(
      'conflictPolicy',
      this.#options.conflictPolicy,
      CONFLICT_POLICIES,
    );

    if (!Array.isArray(providers)) {
      throw new InvalidProviderError(providers);
    }
    for (const [index, provider] of providers.entries()) {
      this.#register(provider, index);
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
    this.#register(provider);
    return this;
  }

  #register(provider: Provider, index?: number): void {
    const record = this.#toRecord(provider, index);

    if (this.#records.has(provider.provide)) {
      switch (this.#options.conflictPolicy ?? 'override') {
        case 'error':
          throw new ProviderConflictError(provider.provide, index);
        case 'ignore':
          return;
      }
    }

    if (record.kind === 'alias') {
      this.#checkAlias(provider.provide, record.target, index);
    }
    this.#records.set(provider.provide, record);
  }

  #checkAlias(
    token: ProviderToken,
    target: ProviderToken,
    index?: number,
  ): void {
    const path = [token];
    let cursor = target;
    while (true) {
      path.push(cursor);
      if (cursor === token) {
        throw new CircularAliasError(path, index);
      }
      const record = this.#records.get(cursor);
      if (record?.kind !== 'alias') {
        return;
      }
      cursor = record.target;
    }
  }

  #toRecord(provider: Provider, index?: number): ProviderRecord {
    if (!isToken(provider?.provide)) {
      throw new InvalidProviderError(provider, index);
    }
    if (isValueProvider(provider)) {
      return { kind: 'value', value: provider.useValue };
    }
    if (isClassProvider(provider)) {
      return {
        kind: 'factory',
        factory: classToFactory(provider.useClass, index),
        lifetime: this.#lifetime(provider.lifetime, index),
      };
    }
    if (isFactoryProvider(provider)) {
      if (typeof provider.useFactory !== 'function') {
        throw new InvalidFactoryError(provider.useFactory, index);
      }
      return {
        kind: 'factory',
        factory: provider.useFactory,
        lifetime: this.#lifetime(provider.lifetime, index),
      };
    }
    if (isExistingProvider(provider) && isToken(provider.useExisting)) {
      return { kind: 'alias', target: provider.useExisting };
    }
    throw new InvalidProviderError(provider, index);
  }

  #lifetime(lifetime: Lifetime | undefined, index?: number): Lifetime {
    return (
      checkOption('lifetime', lifetime, LIFETIMES, index) ??
      this.#options.lifetime ??
      'singleton'
    );
  }

  #getAlias(token: ProviderToken): ProviderToken {
    let cursor = token;
    let record = this.#records.get(cursor);
    while (record?.kind === 'alias') {
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
      if (isReported(error)) {
        throw error;
      }
      throw new ServiceNotCreatedError([...this.#path], error);
    }
  }
}

function isReported(error: unknown): boolean {
  try {
    return (
      error instanceof CircularDependencyError ||
      error instanceof ServiceNotCreatedError
    );
  } catch {
    return false;
  }
}

function isValueProvider(provider: Provider): provider is ValueProvider {
  return 'useValue' in provider;
}

function isClassProvider(provider: Provider): provider is ClassProvider {
  return (provider as ClassProvider).useClass !== undefined;
}

function isFactoryProvider(provider: Provider): provider is FactoryProvider {
  return (provider as FactoryProvider).useFactory !== undefined;
}

function isExistingProvider(provider: Provider): provider is ExistingProvider {
  return (provider as ExistingProvider).useExisting !== undefined;
}

function checkOption<T extends string>(
  option: string,
  value: T | undefined,
  allowed: readonly T[],
  index?: number,
): T | undefined {
  if (value !== undefined && !allowed.includes(value)) {
    throw new InvalidOptionError(option, value, allowed, index);
  }
  return value;
}

function isToken(value: unknown): value is ProviderToken {
  return typeof value === 'string' || typeof value === 'symbol';
}

function classToFactory(type: NoArgument, index?: number): Factory {
  if (!isConstructor(type)) {
    throw new InvalidClassError(type, index);
  }
  if (type.length > 0) {
    throw new InvalidConstructorError(type, index);
  }
  return () => new type();
}

function isConstructor(type: NoArgument): boolean {
  try {
    Reflect.construct(String, [], type);
    return true;
  } catch {
    return false;
  }
}
