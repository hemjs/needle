import {
  ClassProvider,
  Container,
  ExistingProvider,
  Factory,
  FactoryProvider,
  Provider,
  ProviderToken,
  ValueProvider,
} from '@armscye/container';
import { NoArgument, Type } from '@armscye/core';

import {
  CyclicAliasError,
  InvalidClassError,
  InvalidConstructorError,
  InvalidFactoryError,
  InvalidProviderError,
  ProviderNotFoundError,
  ServiceNotCreatedError,
} from './errors';

export interface NeedleOptions {
  shared?: boolean;
}

export class Needle implements Container {
  readonly services = new Map<ProviderToken, any>();
  readonly records = new Map<
    ProviderToken,
    { factory: Factory; shared?: boolean }
  >();
  readonly aliases = new Map<ProviderToken, { token: any; shared?: boolean }>();
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
        const { provide, useClass, shared } = provider;
        const factory = this.classToFactory(useClass);
        this.records.set(provide, this.makeRecord(factory, shared));
      } else if (this.isFactoryProvider(provider)) {
        const { provide, useFactory: factory, shared } = provider;
        this.records.set(provide, this.makeRecord(factory, shared));
      } else if (this.isExistingProvider(provider)) {
        const { provide, useExisting: token, shared } = provider;
        this.aliases.set(provide, this.makeAlias(token, shared));
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

    if (this.aliases.size === 0) {
      const record = this.getRecord(token);
      const object = this.doCreate(token, record.factory);

      if (record.shared === true) {
        this.services.set(token, object);
      }

      return object as T;
    }

    const alias = this.aliases.get(token);
    const resolvedToken = alias?.token ?? token;

    if (this.services.has(resolvedToken) && alias?.shared === true) {
      this.services.set(token, this.services.get(resolvedToken));
      return this.services.get(resolvedToken) as T;
    }

    const record = this.getRecord(resolvedToken);
    const object = this.doCreate(resolvedToken, record.factory);

    if (record.shared === true) {
      this.services.set(resolvedToken, object);
    }

    if (this.aliases.has(token) && alias?.shared === true) {
      this.services.set(token, object);
    }

    return object as T;
  }

  has(token: ProviderToken): boolean {
    if (this.services.has(token) || this.records.has(token)) {
      return true;
    }
    const resolvedToken = this.aliases.get(token)?.token ?? token;
    if (resolvedToken !== token) {
      return this.has(resolvedToken);
    }
    return false;
  }

  addProvider(provider: Provider) {
    if (this.isValueProvider(provider)) {
      this.services.set(provider.provide, provider.useValue);
    } else if (this.isClassProvider(provider)) {
      const { provide, useClass, shared } = provider;
      const factory = this.classToFactory(useClass);
      this.records.set(provide, this.makeRecord(factory, shared));
    } else if (this.isFactoryProvider(provider)) {
      const { provide, useFactory: factory, shared } = provider;
      this.records.set(provide, this.makeRecord(factory, shared));
    } else if (this.isExistingProvider(provider)) {
      const { useExisting: target, provide: alias, shared } = provider;
      this.mapAliasToTarget(alias, target, shared);
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

  mapAliasToTarget(
    alias: ProviderToken,
    target: ProviderToken,
    shared: boolean | undefined,
  ): void {
    const nTarget = this.aliases.get(target) ?? target;
    this.aliases.set(alias, this.makeAlias(nTarget, shared));
    if (alias === this.aliases.get(alias)?.token) {
      throw new CyclicAliasError(alias, this.aliases);
    }
  }

  mapAliasesToTargets(): void {
    const tagged = new Map<any, any>();
    for (const alias of this.aliases.keys()) {
      if (tagged.has(alias)) {
        continue;
      }
      let tCursor = this.aliases.get(alias)?.token;
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
        if (aCursor === this.aliases.get(tCursor)?.token) {
          throw new CyclicAliasError(alias, this.aliases);
        }
        aCursor = tCursor;
        tCursor = this.aliases.get(tCursor);
      }
      tagged.set(aCursor, true);
      for (const alias of stack) {
        this.aliases.set(alias, tCursor);
        tagged.set(alias, true);
      }
    }
  }

  classToFactory(type: NoArgument): () => any {
    if (!this.isNewable(type)) {
      throw new InvalidClassError(type);
    }
    const paramLength = type.length;
    if (paramLength > 0) {
      throw new InvalidConstructorError(type);
    }
    return () => new type();
  }

  isNewable(type: Type<any>): boolean {
    return typeof type === 'function' && type.prototype !== 'undefined';
  }

  makeAlias<T = any>(token: T, shared?: boolean) {
    return {
      token: token,
      shared: this.isShared(shared),
    };
  }

  makeRecord<T = any>(factory: Factory<T>, shared?: boolean) {
    return {
      factory: factory,
      shared: this.isShared(shared),
    };
  }

  isShared(shared?: boolean): boolean {
    if (typeof shared === 'boolean') {
      return shared;
    }
    if (typeof this.options.shared == 'boolean') {
      return this.options.shared;
    }
    return true;
  }
}
