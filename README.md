# @hemjs/needle

> A fast and intuitive dependency injection container for JavaScript and Node.js.

## Table of contents

- [Installation](#installation)
- [Quick start](#quick-start)
- [Introduction](#introduction)
- [Features](#features)
- [Container](#container)
- [Providers](#providers)
- [Best practices](#best-practices)

## Installation

Install with npm:

```sh
npm install --save @hemjs/needle
```

Install with yarn:

```sh
yarn add @hemjs/needle
```

## Quick start

```tsx
// Placeholder for a class that interacts with user data storage (implementation not shown).
class UserRepository {}

// Service for managing user-related operations. It depends on UserRepository to access user data.
class UserService {
  userRepository: UserRepository;

  constructor(userRepository: UserRepository) {
    this.userRepository = userRepository;
  }

  // Example method using UserRepository to retrieve a user by ID
  async getUserById(userId: number): Promise<User> {
    return this.userRepository.getUserById(userId);
  }
}

// Define providers for Needle to create and manage services and their dependencies
const providers = [
  {
    // Register UserRepository as a provider, using the class itself as the implementation
    provide: UserRepository.name,
    useClass: UserRepository,
  },

  {
    // Register UserService as a provider, using a factory function to create it with its dependency
    provide: UserService.name,
    useFactory: (container: Container) =>
      new UserService(container.get<UserRepository>(UserRepository.name)),
  },
  {
    // Provide application configuration object
    provide: 'config',
    useValue: { name: 'My App', version: '1.0.0' },
  },
];

// Create a Needle container with the defined providers
const container = new Needle(providers);

// Usage:
const userService = container.get<UserService>(UserService.name);
const user = await userService.getUserById(123); // Fetch a user with ID 123
console.log(user);

const config = container.get<any>('config'); // Access the configuration object
console.log(config.name); // Output: "My App"
```

## Introduction

Needle streamlines dependency management in your JavaScript and TypeScript applications, empowering you to:

- **Write cleaner, more organized code:** Achieve clear separation of concerns and eliminate repetitive code for better readability and maintainability.
- **Test with confidence:** Effortlessly inject test doubles for isolated, reliable tests that ensure code quality.
- **Focus on your logic, not managing dependencies:** Needle handles the dependency graph for you, freeing you to write efficient and maintainable code.

Whether you're building small web apps or complex enterprise applications, Needle simplifies dependency management and boosts your development experience (e.g., increased speed, improved maintainability).

```tsx
class Engine {
  start() {
    console.log('Engine started!');
  }
}

class Car {
  private engine: Engine = new Engine();

  start() {
    this.engine.start();
  }
}

(() => {
  const car = new Car();
  car.start();
})();
```

Here, while the `Car` class depends on an `Engine` instance to function, the current implementation tightly couples the two. This means the `Car` class is directly responsible for acquiring its own `Engine` dependency, leading to potential drawbacks:

- **Limited flexibility:** The `Car` is restricted to using a single `Engine` implementation. If you need variations (e.g., `Gasoline` or `Electric` engines), you would have to create separate `Car` classes, increasing code duplication and maintenance overhead.
- **Testing challenges:** The hard dependency on `Engine` makes it difficult to isolate and test `Car` independently. You're unable to easily substitute `Engine` with mock or test doubles for different test scenarios.

Dependency injection to the rescue!

```tsx
class Engine {
  start() {
    console.log('Engine started!');
  }
}

class Car {
  constructor(private engine: Engine) {}

  start() {
    this.engine.start();
  }
}

(() => {
  const engine = new Engine();
  const car = new Car(engine);
  car.start();
})();
```

By shifting the `Engine` creation outside of `Car` and accepting it as a constructor argument, we achieve loose coupling. This means `Car` no longer depends on a specific `Engine` implementation, making it more adaptable. This DI approach offers:

- **Enhanced reusability:** You can pass in different `Engine` implementations (e.g., `ElectricEngine`, `HydrogenEngine`) without code changes in `Car` itself, promoting code flexibility and reusability.
- **Simplified testing:** You can inject mock or test doubles of `Engine` (e.g., `FakeEngine`) during testing, enabling precise control over `Car`'s behavior in various test scenarios, leading to more reliable and comprehensive tests.

Dependency injection is simple: providing specific objects your code needs. Needle streamlines this process, making it easier to manage the creation and delivery of these objects (services) within your code, promoting loose coupling and testability. A service, in this context, is any value, function, or feature an application needs.

## Features

### Configuration clarity

Needle embraces programmatic configuration with intuitive provider objects. Each object is defined in a concise structure, making understanding and maintaining them effortless. Whether you're using `ValueProvider` for constants, `ClassProvider` for constructor-less classes, `FactoryProvider` for dynamic logic, or `ExistingProvider` for aliases, Needle offers the flexibility to perfectly match your needs.

### Dependency resolution

Needle tackles even the most intricate dependency graphs with ease. It resolves circular and transitive services seamlessly, saving you the headache of manual management.

### Error handling

Needle gracefully handles configuration and service creation failures, providing informative messages and exceptions to guide you. Debugging becomes a breeze.

## Container

Needle's container manages and delivers the building blocks your application needs, ensuring efficient service creation and access.

### Instantiating a container

Create a new Needle instance using the new Needle() constructor. Optionally, pass an array of provider definitions:

```tsx
const container = new Needle([
  { provide: LoggerService.name, useClass: LoggerService },
]);
```

### Adding providers dynamically

Register providers with the container after its creation using the `addProvider` method:

```tsx
container.addProvider({ provide: 'LOGGER', useExisting: LoggerService.name });
```

### Using the container

Once providers are registered, retrieve instances using the `get` method and their corresponding token:

```tsx
const loggerService = container.get<LoggerService>(LoggerService.name);
const loggerService = container.get<LoggerService>('LOGGER');
```

### Shared

Needle container shares instances by default. This means that calling the `get` method multiple times for a given service will return the same instance. This promotes efficiency by conserving memory and potentially enhancing performance:

```tsx
const container = new Needle([
  { provide: LoggerService.name, useClass: LoggerService },
]);

const obj1 = container.get<LoggerService>(LoggerService.name);
const obj2 = container.get<LoggerService>(LoggerService.name);

console.log(obj1 === obj2); // Output: true
```

However, occasionally you may want to create distinct instances for each request. To achieve this, you can use the `shared: false` option within a provider definition:

```tsx
const container = new Needle([
  { provide: LoggerService.name, useClass: LoggerService, shared: false },
]);

const obj1 = container.get<LoggerService>(LoggerService.name);
const obj2 = container.get<LoggerService>(LoggerService.name);

console.log(obj1 === obj2); // Output: false
```

To disable sharing for all instances by default, set the `shared: false` option at the class level:

```tsx
const container = new Needle([
  { provide: LoggerService.name, useClass: LoggerService },
  { shared: false },
]);

const obj1 = container.get<LoggerService>(LoggerService.name);
const obj2 = container.get<LoggerService>(LoggerService.name);

console.log(obj1 === obj2); // Output: false
```

This approach can be helpful in specific scenarios where you want to ensure each instance is unique. To override this default for a specific provider, use the `shared: true` option within its definition:

```tsx
const container = new Needle([
  { provide: LoggerService.name, useClass: LoggerService, shared: true },
  { shared: false },
]);

const obj1 = container.get<LoggerService>(LoggerService.name);
const obj2 = container.get<LoggerService>(LoggerService.name);

console.log(obj1 === obj2); // Output: true
```

### Dependency resolution

The container performs service dependency resolution as follows:

- For each service, Needle analyzes its constructor arguments to identify dependencies, which can be either actual values or references to other registered services.
- This information is then used to construct a dependency graph where each service is a node and the connections between nodes represent their required dependencies.
- When a service is requested, Needle efficiently navigates the dependency graph, starting from the requesting service and following the connections to identify all its required dependencies.
- Notably, Needle avoids creating services until they are actually needed, optimizing memory usage and performance.
- Based on the defined providers and configuration, Needle selects the appropriate implementation for each service.
- Needle then creates the necessary dependent objects and injects them into the requesting service, fulfilling its needs and completing the dependency chain.
- Optionally, Needle stores instances of shared services for faster retrieval in the future.

### Error handling

Needle prioritizes error handling throughout the dependency resolution process, proactively catching potential issues early and providing informative messages to streamline debugging efforts. The Needle container thoroughly validates provider configurations during creation. If it detects issues like circular dependencies, incorrect provider types, or missing information, it throws an error pinpointing the problematic configuration:

- If a request is made for an unregistered service, the container immediately throws an error clearly identifying the missing provider.
- If a service's constructor throws an error during object creation, Needle propagates the error along with context that identifies the service involved and the reason for the failure.
- If a circular dependency is detected, it throws an error pinpointing the involved services and the circular path.

## Providers

A Needle container manages one or more providers. These providers tell the container how to create and manage the services your application needs to function.They are created based on provider definitions supplied to the container.

A provider definition is essentially a blueprint for constructing the services your application needs. When instructed to provide a specific service (identified by its token), the Noodle container consults the corresponding blueprint and uses its instructions to either create a new instance or retrieve an existing one.

### Provider configuration

Provider configurations define how services are created and accessed within the Needle container. Different provider types offer flexibility on how services are created (static values, classes, factories, aliases). Use the appropriate provider type based on the service's complexity and requirements.

Each provider configuration is represented by an object with two key properties:

- The `provide` property holds a unique token (usually a string or symbol) that serves as the key for both locating a service instance and configuring the container.
- The provider definition object property tells the container how to create the service instance. The provider-definition key can be one of the following:
  - `useValue`: Provides a fixed, static value to be used as the service, often used for configuration constants or mock data.
  - `useClass`: Instructs the container to create a new instance of the specified class when the service is injected.
  - `useFactory`: Defines a function that takes responsibility for constructing the service, enabling dynamic creation logic.
  - `useExisting`: Creates an alias for an existing token, allowing multiple access paths to the same service instance.

**Token naming conventions**

Naming tokens in Needle typically follows these conventions:

- **For classes**: Use the name of the class associated with the service, suffixed with `.name`. For example, `UserRepository.name`, `UserService.name`, `UserHandler.name`, `Logger.name`, etc.
- **For other cases**: Any string constant or symbol is acceptable. For example, `'config'`, `API_URL`, etc.

Naming tokens consistently makes your configuration easier to read and understand.

### Value providers: useValue

The `useValue` key lets you register fixed values directly with the container, making them easily accessible for injection into other parts of your application. This is ideal for registering application configuration constants. You can also use a value provider in a unit test to provide mock data in place of a production data service.

The following example registers application configurations identified by a unique string token (`'config'`).

```tsx
const container = new Needle([
  { provide: 'config', useValue: { name: 'My App', version: '1.0.0' } },
]);

const config = container.get('config');
```

### Class providers: useClass

The `useClass` provider key lets you create and return a new instance of a class with a default (no-argument) constructor.

In the following example, `UserService` class must have a default constructor. Otherwise, an appropriate error is thrown to prevent unexpected behavior.

```tsx
const container = new Needle([
  { provide: UserService.name, useClass: UserService },
]);

const userService = container.get<UserService>(UserService.name);
```

### Factory providers: useFactory

The `useFactory` provider key lets you create a service instance by calling a factory function. The factory function provides an advanced configuration mechanism capable of managing services that require complex initialization steps, conditional logic, or late binding of dependencies.

**Using factory provider**

- Write a function that receives the Needle container instance as an argument and returns the desired service instance.
- Specify the token for your service and provide the factory function.
- Add the factory provider to your Needle container.

```tsx
const userServiceFactory = (container: Container) => {
  const userRepository = container.get<UserRepository>(UserRepository.name);
  return new UserService(userRepository);
};

const container = new Needle([
  { provide: UserService.name, useFactory: userServiceFactory },
]);

const userService = container.get<UserService>(UserService.name);
```

**Tips**

- Factory functions should avoid side effects and focus solely on creating the service instance.
- Leverage container access to inject other services within the factory for dependency management.

### Alias providers: useExisting

The `useExisting` provider key lets you map one token to another. In effect, the first token is an alias for the service associated with the second token, creating two ways to access the same service instance. An alias can also be mapped to another alias (it will be resolved recursively).

In the following example, retrievals using either the `ErrorHandler.name` token or the `'ERROR_HANDLER'` token provide access to the same ErrorHandler instance.

```tsx
const container = new Needle([
  { provide: ErrorHandler.name, useClass: ErrorHandler },
  { provide: 'ERROR_HANDLER', useExisting: ErrorHandler.name },
]);

const errorHandler1 = container.get<ErrorHandler>(ErrorHandler.name);
const errorHandler2 = container.get<ErrorHandler>('ERROR_HANDLER');
```

Aliases can be particularly valuable in several situations, such as when:

- Different components need a specific access point for a shared service. Each component can use an alias token tailored to its context, improving code clarity and isolation.
- Renaming internal service identifiers without impacting dependent components. Aliases allow smooth refactoring by creating new references while maintaining existing connections.
- Providing descriptive or context-specific names for services. You can tailor aliases to better reflect the service's usage within a specific component or integration scenario.

## Best practices

- Choose the right provider type (value, class, factory, alias) based on your service's complexity and creation requirements.
- Choose clear and meaningful names for service tokens, as they act as documentation and entry points for your dependencies.
- Use the shared nature of service instances strategically to improve performance and memory usage, especially for singletons or frequently accessed services.
- Use logging responsibly to monitor container activity and troubleshoot issues without sacrificing performance.
- Before deployment, test your provider configurations and dependencies to prevent potential issues.
- Verify provider configurations during container creation to catch issues early.
