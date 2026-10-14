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

export class Needle implements Container {
  readonly services = new Map<ProviderToken, any>();
  readonly records = new Map<
    ProviderToken,
    { factory: Factory; lifetime: Lifetime }
  >();
  readonly aliases = new Map<ProviderToken, ProviderToken>();
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
      if (this.isValueProvider(provider)) {
        this.services.set(provider.provide, provider.useValue);
      } else if (this.isClassProvider(provider)) {
        const { provide, useClass, lifetime } = provider;
        const factory = this.classToFactory(useClass);
        this.records.set(provide, this.makeRecord(factory, lifetime));
      } else if (this.isFactoryProvider(provider)) {
        const { provide, useFactory: factory, lifetime } = provider;
        this.records.set(provide, this.makeRecord(factory, lifetime));
      } else if (this.isExistingProvider(provider)) {
        this.aliases.set(provider.provide, provider.useExisting);
        newAlias = true;
      } else {
        throw new InvalidProviderError(provider);
      }
    }

    if (newAlias) {
      this.mapAliasesToTargets();
    }

    this.isInitialized = true;
    return this;
  }

  get<T>(token: ProviderToken): T {
    if (this.services.has(token)) {
      return this.services.get(token) as T;
    }

    // An alias follows the lifetime of the provider it resolves to.
    const resolvedToken = this.aliases.get(token) ?? token;

    if (this.services.has(resolvedToken)) {
      return this.services.get(resolvedToken) as T;
    }

    const record = this.getRecord(resolvedToken);
    const object = this.doCreate(resolvedToken, record.factory);

    if (record.lifetime === 'singleton') {
      this.services.set(resolvedToken, object);
    }

    return object as T;
  }

  has(token: ProviderToken): boolean {
    if (this.services.has(token) || this.records.has(token)) {
      return true;
    }
    const resolvedToken = this.aliases.get(token) ?? token;
    if (resolvedToken !== token) {
      return this.has(resolvedToken);
    }
    return false;
  }

  addProvider(provider: Provider) {
    if (this.isValueProvider(provider)) {
      this.services.set(provider.provide, provider.useValue);
    } else if (this.isClassProvider(provider)) {
      const { provide, useClass, lifetime } = provider;
      const factory = this.classToFactory(useClass);
      this.records.set(provide, this.makeRecord(factory, lifetime));
    } else if (this.isFactoryProvider(provider)) {
      const { provide, useFactory: factory, lifetime } = provider;
      this.records.set(provide, this.makeRecord(factory, lifetime));
    } else if (this.isExistingProvider(provider)) {
      this.mapAliasToTarget(provider.provide, provider.useExisting);
    } else {
      throw new InvalidProviderError(provider);
    }
    return this;
  }

  isValueProvider(provider: Provider): provider is ValueProvider {
    return (provider as ValueProvider).useValue !== undefined;
  }

  isClassProvider(provider: Provider): provider is ClassProvider {
    return !!(provider as ClassProvider).useClass;
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
    } catch (error: any) {
      throw new ServiceNotCreatedError(token, error.message);
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

  mapAliasToTarget(alias: ProviderToken, target: ProviderToken): void {
    this.aliases.set(alias, target);
    this.mapAliasesToTargets();
  }

  mapAliasesToTargets(): void {
    const tagged = new Map<ProviderToken, boolean>();
    for (const alias of this.aliases.keys()) {
      if (tagged.has(alias)) {
        continue;
      }
      let tCursor = this.aliases.get(alias)!;
      let aCursor = alias;
      if (aCursor === tCursor) {
        throw new CyclicAliasError(alias, this.aliases);
      }
      if (!this.aliases.has(tCursor)) {
        continue;
      }
      const stack = [];
      while (this.aliases.has(tCursor)) {
        stack.push(aCursor);
        if (stack.includes(tCursor)) {
          throw new CyclicAliasError(tCursor, this.aliases);
        }
        aCursor = tCursor;
        tCursor = this.aliases.get(tCursor)!;
      }
      tagged.set(aCursor, true);
      for (const alias of stack) {
        this.aliases.set(alias, tCursor);
        tagged.set(alias, true);
      }
    }
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
