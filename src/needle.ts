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
  ProviderNotFoundError,
  ServiceNotCreatedError,
} from './errors.js';

export interface NeedleOptions {
  lifetime?: Lifetime;
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
  // Wrapped so that a factory returning undefined still counts as created.
  instance?: { value: unknown };
}

type Registration = ValueRegistration | AliasRegistration | FactoryRegistration;

export class Needle implements Container {
  // One registration per token: registering a token again replaces its
  // registration, including any cached instance.
  readonly #registry = new Map<ProviderToken, Registration>();
  readonly #resolving = new Set<ProviderToken>();
  readonly #options: NeedleOptions;

  constructor(providers: Provider[] = [], options: NeedleOptions = {}) {
    this.#options = options;

    for (const provider of providers) {
      this.#register(provider);
    }

    // Aliases may point at tokens registered later in the list, so check
    // them for cycles once everything is registered, in list order.
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
    this.#register(provider);
    if (isExistingProvider(provider)) {
      // Any cycle this alias creates must pass through it.
      this.#resolveAlias(provider.provide);
    }
    return this;
  }

  #register(provider: Provider): void {
    if (isValueProvider(provider)) {
      this.#registry.set(provider.provide, {
        kind: 'value',
        value: provider.useValue,
      });
    } else if (isClassProvider(provider)) {
      const { provide, useClass, lifetime } = provider;
      this.#registry.set(provide, {
        kind: 'factory',
        factory: classToFactory(useClass),
        lifetime: lifetime ?? this.#options.lifetime ?? 'singleton',
      });
    } else if (isFactoryProvider(provider)) {
      const { provide, useFactory, lifetime } = provider;
      this.#registry.set(provide, {
        kind: 'factory',
        factory: useFactory,
        lifetime: lifetime ?? this.#options.lifetime ?? 'singleton',
      });
    } else if (isExistingProvider(provider)) {
      this.#registry.set(provider.provide, {
        kind: 'alias',
        target: provider.useExisting,
      });
    } else {
      throw new InvalidProviderError(provider);
    }
  }

  // Aliases are stored as registered and followed on every lookup, so
  // replacing any link in a chain takes effect.
  #resolveAlias(token: ProviderToken): ProviderToken {
    let registration = this.#registry.get(token);
    if (registration?.kind !== 'alias') {
      return token;
    }

    const seen = new Set<ProviderToken>();
    let cursor = token;
    while (registration?.kind === 'alias') {
      if (seen.has(cursor)) {
        // Report from cursor: it lies on the cycle, while `token` may only
        // lead into it.
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

    if (typeof registration.factory !== 'function') {
      throw new InvalidFactoryError(registration.factory);
    }

    if (this.#resolving.has(token)) {
      const path = [...this.#resolving];
      const cycle = path.slice(path.indexOf(token));
      throw new CyclicDependencyError([...cycle, token]);
    }

    this.#resolving.add(token);
    let object: unknown;
    try {
      object = this.#create(token, registration.factory);
    } finally {
      this.#resolving.delete(token);
    }

    if (registration.lifetime === 'singleton') {
      registration.instance = { value: object };
    }

    return object;
  }

  #create(token: ProviderToken, factory: Factory): unknown {
    try {
      return factory(this);
    } catch (error) {
      // Wrap only the innermost failure; its message carries the path.
      if (
        error instanceof CyclicDependencyError ||
        error instanceof ServiceNotCreatedError
      ) {
        throw error;
      }
      const path = [...this.#resolving];
      if (path[path.length - 1] !== token) {
        path.push(token);
      }
      throw new ServiceNotCreatedError(path, error);
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
