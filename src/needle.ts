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
  ProviderOverrideError,
  ServiceNotCreatedError,
} from './errors.js';

export interface NeedleOptions {
  lifetime?: Lifetime;
  allowOverride?: boolean;
}

export class Needle implements Container {
  readonly services = new Map<ProviderToken, any>();
  readonly records = new Map<
    ProviderToken,
    { factory: Factory; lifetime: Lifetime }
  >();
  readonly aliases = new Map<ProviderToken, ProviderToken>();
  readonly resolving = new Set<ProviderToken>();
  readonly requested = new Set<ProviderToken>();
  isInitialized = false;

  constructor(
    providers: Provider[] = [],
    readonly options: NeedleOptions = {},
  ) {
    this.initialize(providers);
  }

  initialize(providers: Provider[]) {
    let newAlias = false;
    for (const provider of providers) {
      this.register(provider);
      newAlias ||= this.isExistingProvider(provider);
    }

    if (newAlias) {
      for (const alias of this.aliases.keys()) {
        this.resolveAlias(alias);
      }
    }

    this.isInitialized = true;
    return this;
  }

  get<T>(token: ProviderToken): T {
    const object = this.resolve<T>(token);
    if (!this.requested.has(token)) {
      this.markRequested(token);
    }
    return object;
  }

  resolve<T>(token: ProviderToken): T {
    if (this.services.has(token)) {
      return this.services.get(token) as T;
    }

    const resolvedToken = this.resolveAlias(token);

    if (this.services.has(resolvedToken)) {
      return this.services.get(resolvedToken) as T;
    }

    const record = this.getRecord(resolvedToken);

    if (this.resolving.has(resolvedToken)) {
      const path = [...this.resolving];
      const cycle = path.slice(path.indexOf(resolvedToken));
      throw new CyclicDependencyError([...cycle, resolvedToken]);
    }

    this.resolving.add(resolvedToken);
    let object: any;
    try {
      object = this.doCreate(resolvedToken, record.factory);
    } finally {
      this.resolving.delete(resolvedToken);
    }

    if (record.lifetime === 'singleton') {
      this.services.set(resolvedToken, object);
    }

    return object as T;
  }

  has(token: ProviderToken): boolean {
    const resolvedToken = this.resolveAlias(token);
    return this.services.has(resolvedToken) || this.records.has(resolvedToken);
  }

  addProvider(provider: Provider) {
    this.register(provider);
    if (this.isExistingProvider(provider)) {
      this.resolveAlias(provider.provide);
    }
    return this;
  }

  register(provider: Provider): void {
    if (this.isValueProvider(provider)) {
      this.assertOverridable(provider.provide);
      this.unregister(provider.provide);
      this.services.set(provider.provide, provider.useValue);
    } else if (this.isClassProvider(provider)) {
      const { provide, useClass, lifetime } = provider;
      const factory = this.classToFactory(useClass);
      this.assertOverridable(provide);
      this.unregister(provide);
      this.records.set(provide, this.makeRecord(factory, lifetime));
    } else if (this.isFactoryProvider(provider)) {
      const { provide, useFactory: factory, lifetime } = provider;
      this.assertOverridable(provide);
      this.unregister(provide);
      this.records.set(provide, this.makeRecord(factory, lifetime));
    } else if (this.isExistingProvider(provider)) {
      this.assertOverridable(provider.provide);
      this.unregister(provider.provide);
      this.aliases.set(provider.provide, provider.useExisting);
    } else {
      throw new InvalidProviderError(provider);
    }
  }

  assertOverridable(token: ProviderToken): void {
    if (this.options.allowOverride !== true && this.requested.has(token)) {
      throw new ProviderOverrideError(token);
    }
  }

  markRequested(token: ProviderToken): void {
    let cursor = token;
    this.requested.add(cursor);
    while (this.aliases.has(cursor)) {
      cursor = this.aliases.get(cursor)!;
      this.requested.add(cursor);
    }
  }

  unregister(token: ProviderToken): void {
    this.services.delete(token);
    this.records.delete(token);
    this.aliases.delete(token);
  }

  isValueProvider(provider: Provider): provider is ValueProvider {
    return (
      typeof provider === 'object' &&
      provider !== null &&
      'useValue' in provider
    );
  }

  isClassProvider(provider: Provider): provider is ClassProvider {
    return !!(provider && (provider as ClassProvider).useClass);
  }

  isFactoryProvider(provider: Provider): provider is FactoryProvider {
    return !!(provider && (provider as FactoryProvider).useFactory);
  }

  isExistingProvider(provider: Provider): provider is ExistingProvider {
    return !!(provider && (provider as ExistingProvider).useExisting);
  }

  doCreate<T>(token: ProviderToken, factory: Factory<T>) {
    let object: any;
    try {
      object = factory(this);
    } catch (error) {
      if (
        error instanceof CyclicDependencyError ||
        error instanceof ServiceNotCreatedError
      ) {
        throw error;
      }
      const path = [...this.resolving];
      if (path[path.length - 1] !== token) {
        path.push(token);
      }
      throw new ServiceNotCreatedError(path, error);
    }
    return object;
  }

  getRecord(token: ProviderToken) {
    const record = this.records.get(token) ?? null;
    if (record === null) {
      throw new ProviderNotFoundError(token);
    }
    if (typeof record.factory !== 'function') {
      throw new InvalidFactoryError(record.factory);
    }
    return record;
  }

  resolveAlias(token: ProviderToken): ProviderToken {
    const seen = new Set<ProviderToken>();
    let cursor = token;
    while (this.aliases.has(cursor)) {
      if (seen.has(cursor)) {
        throw new CyclicAliasError(cursor, this.aliases);
      }
      seen.add(cursor);
      cursor = this.aliases.get(cursor)!;
    }
    return cursor;
  }

  classToFactory(type: NoArgument<any>): () => any {
    if (!this.isNewable(type)) {
      throw new InvalidClassError(type);
    }
    const paramLength = type.length;
    if (paramLength > 0) {
      throw new InvalidConstructorError(type);
    }
    return () => new (type as Type<any>)();
  }

  isNewable(type: Type<any>): boolean {
    return typeof type === 'function' && typeof type.prototype !== 'undefined';
  }

  makeRecord<T = any>(factory: Factory<T>, lifetime?: Lifetime) {
    return {
      factory: factory,
      lifetime: lifetime ?? this.options.lifetime ?? 'singleton',
    };
  }
}
