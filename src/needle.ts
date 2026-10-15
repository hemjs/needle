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
  CyclicAliasError,
  CyclicDependencyError,
  InvalidClassError,
  InvalidConstructorError,
  InvalidFactoryError,
  InvalidProviderError,
  ProviderConflictError,
  ProviderNotFoundError,
  ServiceNotCreatedError,
} from './errors.js';

export type ConflictPolicy = 'override' | 'error' | 'ignore';

export interface NeedleOptions {
  lifetime?: Lifetime;
  conflictPolicy?: ConflictPolicy;
}

interface ValueRegistration {
  kind: 'value';
  value: unknown;
}

interface AliasRegistration {
  kind: 'alias';
  target: ProviderToken;
}

interface FactoryRegistration {
  kind: 'factory';
  factory: Factory;
  lifetime: Lifetime;
  instance?: { value: unknown };
}

type Registration = ValueRegistration | AliasRegistration | FactoryRegistration;

export class Needle implements Container {
  readonly #registry = new Map<ProviderToken, Registration>();
  readonly #resolving = new Set<ProviderToken>();
  readonly #options: NeedleOptions;

  constructor(providers: Provider[] = [], options: NeedleOptions = {}) {
    this.#options = options;

    for (const [index, provider] of providers.entries()) {
      this.#register(provider, index);
    }

    for (const provider of providers) {
      if (isExistingProvider(provider)) {
        this.#resolveAlias(provider.provide);
      }
    }
  }

  get<T>(token: ProviderToken): T {
    const resolvedToken = this.#resolveAlias(token);
    const registration = this.#registry.get(resolvedToken);

    switch (registration?.kind) {
      case 'value':
        return registration.value as T;
      case 'factory':
        return this.#instantiate(resolvedToken, registration) as T;
      default:
        throw new ProviderNotFoundError(resolvedToken);
    }
  }

  has(token: ProviderToken): boolean {
    return this.#registry.has(this.#resolveAlias(token));
  }

  addProvider(provider: Provider): this {
    if (!isExistingProvider(provider)) {
      this.#register(provider);
      return this;
    }

    const previous = this.#registry.get(provider.provide);
    if (!this.#register(provider)) {
      return this;
    }
    try {
      this.#resolveAlias(provider.provide);
    } catch (error) {
      if (previous === undefined) {
        this.#registry.delete(provider.provide);
      } else {
        this.#registry.set(provider.provide, previous);
      }
      throw error;
    }
    return this;
  }

  #register(provider: Provider, index?: number): boolean {
    const registration = this.#toRegistration(provider, index);

    if (this.#registry.has(provider.provide)) {
      switch (this.#options.conflictPolicy ?? 'override') {
        case 'error':
          throw new ProviderConflictError(provider.provide, index);
        case 'ignore':
          return false;
      }
    }

    this.#registry.set(provider.provide, registration);
    return true;
  }

  #toRegistration(provider: Provider, index?: number): Registration {
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

  #resolveAlias(token: ProviderToken): ProviderToken {
    let registration = this.#registry.get(token);
    if (registration?.kind !== 'alias') {
      return token;
    }

    const seen = new Set<ProviderToken>();
    let cursor = token;
    while (registration?.kind === 'alias') {
      if (seen.has(cursor)) {
        const path = [...seen];
        throw new CyclicAliasError([
          ...path.slice(path.indexOf(cursor)),
          cursor,
        ]);
      }
      seen.add(cursor);
      cursor = registration.target;
      registration = this.#registry.get(cursor);
    }
    return cursor;
  }

  #instantiate(token: ProviderToken, registration: FactoryRegistration) {
    if (registration.instance) {
      return registration.instance.value;
    }

    if (this.#resolving.has(token)) {
      const path = [...this.#resolving];
      const cycle = path.slice(path.indexOf(token));
      throw new CyclicDependencyError([...cycle, token]);
    }

    this.#resolving.add(token);
    let object: unknown;
    try {
      object = this.#create(registration.factory);
    } finally {
      this.#resolving.delete(token);
    }

    if (registration.lifetime === 'singleton') {
      registration.instance = { value: object };
    }

    return object;
  }

  #create(factory: Factory): unknown {
    try {
      return factory(this);
    } catch (error) {
      if (
        error instanceof CyclicDependencyError ||
        error instanceof ServiceNotCreatedError
      ) {
        throw error;
      }
      throw new ServiceNotCreatedError([...this.#resolving], error);
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
  if (!isNewable(type)) {
    throw new InvalidClassError(type);
  }
  if (type.length > 0) {
    throw new InvalidConstructorError(type);
  }
  return () => new (type as Type<any>)();
}

function isNewable(type: Type<any>): boolean {
  return typeof type === 'function' && typeof type.prototype !== 'undefined';
}
