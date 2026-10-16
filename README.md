# @hemjs/needle

> A lightweight and intuitive dependency injection container for JavaScript and TypeScript.

Needle builds your services from a list of providers and hands them out by token. Values, classes, factories and aliases cover the ways a service can be made; singleton and transient lifetimes decide when it is shared; and a conflict policy decides what happens when two providers claim the same token. Providers are checked as soon as they are registered, alias and dependency cycles are detected, and every error says which provider or service is at fault. Everything is synchronous, with no decorators or reflection to configure.

## Table of contents

- [Installation](#installation)
- [Quick start](#quick-start)
- [How it works](#how-it-works)
- [Tokens](#tokens)
- [Providers](#providers)
- [Building a container](#building-a-container)
- [Resolving services](#resolving-services)
- [Lifetime](#lifetime)
- [Conflict policy](#conflict-policy)
- [Errors](#errors)
- [Testing](#testing)
- [Upgrading from 1.x](#upgrading-from-1x)
- [License](#license)

## Installation

Needle is published as an ES module and requires Node.js 22.12 or later.

```sh
npm install @hemjs/needle
```

```sh
pnpm add @hemjs/needle
```

```sh
yarn add @hemjs/needle
```

CommonJS code can still load it with `require()`, which Node.js 22.12 and later support for ES modules.

## Quick start

```ts
import { Needle } from '@hemjs/needle';

interface User {
  id: number;
  name: string;
}

class UserRepository {
  #users = new Map<number, User>([[1, { id: 1, name: 'Ada' }]]);

  find(id: number): User | undefined {
    return this.#users.get(id);
  }
}

class UserService {
  #userRepository: UserRepository;

  constructor(userRepository: UserRepository) {
    this.#userRepository = userRepository;
  }

  greet(id: number): string {
    const user = this.#userRepository.find(id);
    return user ? `Hello, ${user.name}!` : 'Hello, stranger!';
  }
}

const USER_REPOSITORY = Symbol('UserRepository');
const USER_SERVICE = Symbol('UserService');

const container = new Needle([
  { provide: USER_REPOSITORY, useClass: UserRepository },
  {
    provide: USER_SERVICE,
    useFactory: (c) => new UserService(c.get<UserRepository>(USER_REPOSITORY)),
  },
]);

const userService = container.get<UserService>(USER_SERVICE);
console.log(userService.greet(1)); // Hello, Ada!
```

## How it works

Dependency injection means a class receives the things it depends on instead of creating them itself. A `UserService` that is given a `UserRepository` can be tested with a fake repository, and can be pointed at a different store without changing its code.

Needle is the piece that does the giving. You register **providers**, each of which tells Needle how to produce one service and which **token** identifies it. When you ask the container for a token, it finds the provider and returns the service:

- **Values** are returned as given.
- **Classes** are constructed, and **factories** called, the first time the service is needed. A factory receives the container, so it can ask for the services it depends on.
- **Aliases** point one token at another.

Services are created lazily, on the first `get`, and by default only once.

A common way to set Needle up is to create one container when your application starts, with all the providers it needs, add any extras with `addProvider`, and export it for the rest of the application to use.

## Tokens

A token is the key a service is registered and requested under. It can be a string or a symbol.

Symbols are the safest choice: two symbols never collide, even when their descriptions match. Export them from the module that defines the service:

```ts
export const LOGGER = Symbol('Logger');
```

Strings are convenient for configuration values and when tokens are shared across packages, such as `'config'` or `'http.client'`.

Avoid deriving tokens from class names (`Logger.name`). Minifiers rename classes, and two classes with the same name in different modules would share a token.

The examples below use symbols for services, such as `LOGGER` and `CLOCK`, and short strings for configuration values and where only the shape of an example matters.

## Providers

Every provider has a `provide` token and exactly one of the following keys, which says how the service is produced.

### Values: `useValue`

Registers an existing value. Use it for configuration, constants, or objects created elsewhere:

```ts
const container = new Needle([
  { provide: 'config', useValue: { port: 8080, debug: false } },
]);

container.get('config'); // { port: 8080, debug: false }
```

The value is returned exactly as given on every `get`, so the same object is always shared. `null` and `undefined` are valid values.

### Classes: `useClass`

Creates the service by calling `new` on a class:

```ts
class Clock {
  now(): Date {
    return new Date();
  }
}

const container = new Needle([{ provide: CLOCK, useClass: Clock }]);
```

Needle does not pass arguments to the constructor, so the class must be constructible without them. Parameters with default values are fine. If a class needs other services, register it with a factory instead.

Needle checks the class when it is registered: a value that cannot be called with `new` throws `InvalidClassError`, and a constructor with required parameters throws `InvalidConstructorError`.

### Factories: `useFactory`

Creates the service by calling a function. The function receives the container, so it can request the services it depends on:

```ts
const container = new Needle([
  { provide: 'config', useValue: { greeting: 'Hello' } },
  {
    provide: GREETER,
    useFactory: (c) => {
      const { greeting } = c.get<{ greeting: string }>('config');
      return (name: string) => `${greeting}, ${name}!`;
    },
  },
]);

container.get<(name: string) => string>(GREETER)('Ada'); // Hello, Ada!
```

Factories are the way to build services that take constructor arguments, choose an implementation at runtime, or need setup before use. A factory that is not a function throws `InvalidFactoryError` when it is registered.

Inside a provider list, TypeScript infers the factory's parameter type. A factory written as a separate function can type its parameter with `Container` from [`@armscye/container`](https://www.npmjs.com/package/@armscye/container), the package that defines Needle's types. Add it to your own dependencies to import from it:

```ts
import type { Container } from '@armscye/container';

export function createGreeter(c: Container) {
  const { greeting } = c.get<{ greeting: string }>('config');
  return (name: string) => `${greeting}, ${name}!`;
}
```

### Aliases: `useExisting`

Makes one token refer to another provider. Both tokens then return the same service:

```ts
const container = new Needle([
  { provide: LOGGER, useClass: ConsoleLogger },
  { provide: 'logger', useExisting: LOGGER }, // an older token, kept working
]);

container.get('logger') === container.get(LOGGER); // true
```

Aliases are useful for giving a service a second, more specific name, or for keeping an old token working after renaming it. An alias can point at another alias; Needle follows the chain to the provider at its end.

An alias has no lifetime of its own. It returns whatever its target returns, so aliasing a singleton gives the same instance and aliasing a transient service gives a new one each time.

Aliases that form a loop, such as `a -> b -> a`, throw `CircularAliasError` when the container is created or, for `addProvider`, when the alias is added.

## Building a container

Pass the providers to the constructor:

```ts
const container = new Needle([
  { provide: 'config', useValue: config },
  { provide: LOGGER, useClass: ConsoleLogger },
]);
```

Register more providers later with `addProvider`. It returns the container, so calls can be chained:

```ts
container
  .addProvider({ provide: CLOCK, useClass: SystemClock })
  .addProvider({ provide: TIME_SOURCE, useExisting: CLOCK });
```

Providers are validated as they are registered. An error for a provider in the constructor's list includes its position, which helps when the list is assembled from several modules:

```text
InvalidProviderError: Invalid provider definition detected; only instances of Provider are allowed, got: [{"provide":"broken"}] at index 12.
```

The constructor also accepts options:

| Option           | Values                              | Default       | See                                 |
| ---------------- | ----------------------------------- | ------------- | ----------------------------------- |
| `lifetime`       | `'singleton'`, `'transient'`        | `'singleton'` | [Lifetime](#lifetime)               |
| `conflictPolicy` | `'override'`, `'error'`, `'ignore'` | `'override'`  | [Conflict policy](#conflict-policy) |

The options object is typed as `NeedleOptions`, and `ConflictPolicy` is the type of `conflictPolicy`. Both are exported, which helps when options are assembled in a module of their own.

## Resolving services

Use `get` to obtain a service and `has` to check whether one is registered:

```ts
const logger = container.get<Logger>(LOGGER);

if (container.has(METRICS)) {
  container.get<Metrics>(METRICS).increment('startup');
}
```

`get` throws `ProviderNotFoundError` when nothing is registered for the token. For an alias whose target is missing, `has` returns `false` and the error names the missing target.

The type argument of `get` is not checked against what is registered: `get<Logger>(CLOCK)` compiles and returns the clock. Keep each token's type next to the token, for example in the module that exports it.

### Dependencies between services

Factories resolve their dependencies by calling `get` on the container they receive. Needle creates each dependency on demand, so dependencies can appear anywhere in the list:

```ts
const container = new Needle([
  {
    provide: ORDER_SERVICE,
    useFactory: (c) => new OrderService(c.get(ORDER_REPOSITORY), c.get(LOGGER)),
  },
  { provide: ORDER_REPOSITORY, useClass: InMemoryOrderRepository },
  { provide: LOGGER, useClass: ConsoleLogger },
]);
```

### Optional dependencies

`get` throws for a token with no provider, so a factory that can work without a service should check for it with `has` first:

```ts
const container = new Needle([
  {
    provide: MAILER,
    useFactory: (c) =>
      new Mailer(c.has(METRICS) ? c.get<Metrics>(METRICS) : null),
  },
]);
```

The mailer then works whether or not metrics are configured. `has` follows aliases, so it also answers for a token that is an alias of a registered service.

### Circular dependencies

Two services that need each other while being created cannot both be built first. Needle detects this and throws `CircularDependencyError` with the cycle:

```ts
const container = new Needle([
  { provide: 'a', useFactory: (c) => new A(c.get('b')) },
  { provide: 'b', useFactory: (c) => new B(c.get('a')) },
]);

container.get('a'); // CircularDependencyError: Circular dependency detected: a -> b -> a
```

To break a cycle, let one side look up the other when it first uses it rather than while it is being created:

```ts
const container = new Needle([
  { provide: 'a', useFactory: (c) => new A(() => c.get('b')) },
  { provide: 'b', useFactory: (c) => new B(c.get('a')) },
]);
```

## Lifetime

A provider's lifetime decides whether `get` reuses one instance or creates a new one each time. It applies to class and factory providers:

| Lifetime    | Behavior                                                                  |
| ----------- | ------------------------------------------------------------------------- |
| `singleton` | Created on the first `get`, then the same instance is returned. (Default) |
| `transient` | Created again on every `get`.                                             |

```ts
const container = new Needle([
  { provide: CLOCK, useClass: Clock },
  {
    provide: REQUEST_ID,
    useFactory: () => crypto.randomUUID(),
    lifetime: 'transient',
  },
]);

container.get(CLOCK) === container.get(CLOCK); // true
container.get(REQUEST_ID) === container.get(REQUEST_ID); // false
```

To change the default for every provider, pass `lifetime` to the constructor. A `lifetime` on a provider always takes precedence:

```ts
const container = new Needle(
  [
    { provide: REQUEST_ID, useFactory: () => crypto.randomUUID() }, // transient
    { provide: CLOCK, useClass: Clock, lifetime: 'singleton' }, // singleton
  ],
  { lifetime: 'transient' },
);
```

Value providers always return the value they were given, and aliases follow the lifetime of their target.

## Conflict policy

A conflict happens when a provider is registered for a token that already has one, either within the constructor's list or through `addProvider`. The `conflictPolicy` option decides what happens:

| Policy     | Behavior                                                                               |
| ---------- | -------------------------------------------------------------------------------------- |
| `override` | The new provider replaces the previous one; the last registration wins. (Default)      |
| `error`    | Needle throws a `ProviderConflictError` naming the token and, for the list, its index. |
| `ignore`   | The new provider is skipped; the first registration wins.                              |

Every provider is validated before the policy applies, so an invalid provider is reported whatever the policy.

`override` lets later providers replace earlier ones, for example when an application overrides defaults supplied by a library:

```ts
const container = new Needle([
  { provide: LOGGER, useClass: ConsoleLogger }, // library default
  { provide: LOGGER, useClass: FileLogger }, // application override
]);

container.get(LOGGER); // a FileLogger
```

Replacing a provider does not affect services that were already created with the previous one; they keep the instance they received.

Use `error` when every token should have exactly one provider, so that two modules claiming the same token are caught when the container is created:

```ts
const container = new Needle(providers, { conflictPolicy: 'error' });
// ProviderConflictError: A provider for "Symbol(Logger)" is already registered; conflicting provider at index 12.
```

Use `ignore` when the providers registered first should win, such as test doubles placed ahead of the application's providers:

```ts
const container = new Needle(
  [{ provide: MAILER, useValue: fakeMailer }, ...providers],
  { conflictPolicy: 'ignore' },
);
```

## Errors

Every error Needle throws extends `NeedleError`, and each has its own class and `name`, so you can tell them apart:

```ts
import { ProviderNotFoundError } from '@hemjs/needle';

let payments: Payments;
try {
  payments = container.get<Payments>(PAYMENTS);
} catch (error) {
  if (!(error instanceof ProviderNotFoundError)) {
    throw error;
  }
  payments = new NoopPayments();
}
```

To handle every container error in one place, check for `NeedleError` instead.

| Error                     | Thrown when                                                                    |
| ------------------------- | ------------------------------------------------------------------------------ |
| `InvalidProviderError`    | A provider has no valid `useValue`, `useClass`, `useFactory` or `useExisting`. |
| `InvalidClassError`       | `useClass` is not something that can be called with `new`.                     |
| `InvalidConstructorError` | `useClass` has a constructor with required parameters.                         |
| `InvalidFactoryError`     | `useFactory` is not a function.                                                |
| `ProviderConflictError`   | A token is registered twice under the `error` conflict policy.                 |
| `CircularAliasError`      | Aliases form a loop.                                                           |
| `ProviderNotFoundError`   | `get` is called for a token with no provider.                                  |
| `CircularDependencyError` | Services depend on each other while being created.                             |
| `ServiceNotCreatedError`  | A constructor or factory throws while creating a service.                      |

The first six are thrown when a provider is registered, so most configuration mistakes surface as soon as the container is created. The last three are thrown by `get`.

When a constructor or factory throws, Needle wraps the error once, at the service that failed, and shows the chain of services that led there. The original error is kept as `cause`:

```text
ServiceNotCreatedError: Service for "Engine" could not be created (Car -> Engine). Reason: no fuel
```

After any error, the container stays usable for other services.

## Testing

To test with doubles, build a container from the application's providers and register the doubles after them. With the default `override` policy, the later provider replaces the real one:

```ts
const container = new Needle(providers);
container.addProvider({ provide: MAILER, useValue: fakeMailer });

container.get(MAILER) === fakeMailer; // true
```

Services that depend on `MAILER` now receive `fakeMailer` when they are created.

Register the doubles before anything that depends on them is first resolved. A service that was already created keeps the instance it received.

If the application uses the `error` conflict policy, replacing a provider throws. Place the doubles first and use `ignore` instead, as shown under [Conflict policy](#conflict-policy).

## Upgrading from 1.x

Version 2 narrows the container to a small public API and reports problems earlier. Most applications only need the changes in the first three items.

- **ES modules.** Needle is published as an ES module and requires Node.js 22.12 or later. On those versions, CommonJS code can still `require()` it.
- **`shared` is replaced by `lifetime`.** Replace `shared: true` with `lifetime: 'singleton'` and `shared: false` with `lifetime: 'transient'`, both on providers and in the constructor's options.
- **The public API is the constructor, `get`, `has` and `addProvider`.** `initialize()` is removed: pass providers to the constructor or call `addProvider`. `isInitialized`, `options`, the internal maps (`services`, `records`, `aliases`) and helper methods such as `isValueProvider` are no longer accessible.
- **Aliases follow their target's lifetime.** `useExisting` providers no longer accept `lifetime` or `shared`; an alias returns whatever its target returns.
- **The last registration for a token wins.** Registering a token again replaces its previous provider, including any instance already created for it. Use the [conflict policy](#conflict-policy) to make duplicates an error or to keep the first registration instead.
- **Problems are reported earlier.** Factories that are not functions and `useClass` values that cannot be constructed now fail when they are registered rather than on `get`. Circular dependencies throw `CircularDependencyError` instead of overflowing the stack.
- **Errors are exported.** All error classes can be imported and checked with `instanceof`, and several messages are clearer. Code that matched error message text may need updating.
- **Types.** Needle now uses `@armscye/container` 0.8, whose provider types no longer include `shared`.

## License

This project is licensed under the **MIT license**.

See [LICENSE](./LICENSE) for more information.
