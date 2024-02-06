import { Container } from '@armscye/container';

import { Needle } from '../src';

class Engine {}

class BrokenEngine {
  constructor() {
    throw new Error('Broken Engine');
  }
}

class DashboardSoftware {}

class Dashboard {
  constructor(software: DashboardSoftware) {}
}

class TurboEngine extends Engine {}

class Car {
  constructor(public engine: Engine) {}
}

class CarWithOptionalEngine {
  constructor(public engine?: Engine) {}
}

class CarWithDashboard {
  engine: Engine;
  dashboard: Dashboard;
  constructor(engine: Engine, dashboard: Dashboard) {
    this.engine = engine;
    this.dashboard = dashboard;
  }
}

class SportsCar extends Car {}

test('Needle creates an instance', () => {
  expect(new Needle()).toBeInstanceOf(Needle);
});

test('Needle resolves classes with default constructors', () => {
  const needle = new Needle([{ provide: Engine.name, useClass: Engine }]);
  const engine = needle.get(Engine.name);

  expect(engine).toBeInstanceOf(Engine);
});

test('Needle injects dependencies based on constructor arguments', () => {
  const needle = new Needle([
    { provide: Engine.name, useClass: Engine },
    {
      provide: Car.name,
      useFactory: (container: Container) => new Car(container.get(Engine.name)),
    },
  ]);
  const car = needle.get<Car>(Car.name);

  expect(car).toBeInstanceOf(Car);
  expect(car.engine).toBeInstanceOf(Engine);
});

test('Needle caches instances by default', () => {
  const needle = new Needle([{ provide: Engine.name, useClass: Engine }]);

  const a1 = needle.get(Engine.name);
  const a2 = needle.get(Engine.name);

  expect(a1).toBe(a2);
});

test('Needle overrides default caching (shared: false)', () => {
  const needle = new Needle([{ provide: Engine.name, useClass: Engine }], {
    shared: false,
  });

  const a1 = needle.get(Engine.name);
  const a2 = needle.get(Engine.name);

  expect(a1).not.toBe(a2);
});

test('Needle caches instances with provider (shared: true)', () => {
  const needle = new Needle([
    { provide: Engine.name, useClass: Engine, shared: true },
  ]);

  const a1 = needle.get(Engine.name);
  const a2 = needle.get(Engine.name);

  expect(a1).toBe(a2);
});

test('Needle disables caching with provider (shared: false)', () => {
  const needle = new Needle([
    { provide: Engine.name, useClass: Engine, shared: false },
  ]);

  const a1 = needle.get(Engine.name);
  const a2 = needle.get(Engine.name);

  expect(a1).not.toBe(a2);
});

test('Needle overrides global `shared` option with provider (shared:true)', () => {
  const needle = new Needle(
    [{ provide: Engine.name, useClass: Engine, shared: true }],
    {
      shared: false,
    },
  );

  const a1 = needle.get(Engine.name);
  const a2 = needle.get(Engine.name);

  expect(a1).toBe(a2);
});

test('Needle caches aliased instances', () => {
  const needle = new Needle([
    { provide: TurboEngine.name, useClass: TurboEngine },
    { provide: Engine.name, useExisting: TurboEngine.name },
  ]);

  const a1 = needle.get(Engine.name);
  const a2 = needle.get(Engine.name);

  expect(a1).toBe(a2);
});

test('Needle disables caching for aliased instances', () => {
  const needle = new Needle(
    [
      { provide: TurboEngine.name, useClass: TurboEngine },
      { provide: Engine.name, useExisting: TurboEngine.name },
    ],
    { shared: false },
  );

  const a1 = needle.get(Engine.name);
  const a2 = needle.get(Engine.name);

  expect(a1).not.toBe(a2);
});

test('Needle overrides global `shared` option for non-cached aliased instances', () => {
  const needle = new Needle(
    [
      { provide: TurboEngine.name, useClass: TurboEngine },
      { provide: Engine.name, useExisting: TurboEngine.name, shared: true },
    ],
    { shared: false },
  );

  const a1 = needle.get(Engine.name);
  const a2 = needle.get(Engine.name);

  expect(a1).toBe(a2);
});

test('Needle resolves providers to values', () => {
  const needle = new Needle([
    { provide: Engine.name, useValue: 'fake engine' },
  ]);
  const engine = needle.get(Engine.name);

  expect(engine).toEqual('fake engine');
});

test('Needle injects dependencies using provider factories', () => {
  function sportsCarFactory(container: Container) {
    return new SportsCar(container.get(Engine.name));
  }
  const needle = new Needle([
    { provide: Engine.name, useClass: Engine },
    { provide: Car.name, useFactory: sportsCarFactory },
  ]);
  const car = needle.get<Car>(Car.name);

  expect(car).toBeInstanceOf(SportsCar);
  expect(car.engine).toBeInstanceOf(Engine);
});

test('Needle resolves providers to null values', () => {
  const needle = new Needle([{ provide: Engine.name, useValue: null }]);
  const engine = needle.get(Engine.name);

  expect(engine).toBeNull();
});

test('Needle uses aliases to reference existing providers', () => {
  const needle = new Needle([
    { provide: Engine.name, useClass: Engine },
    {
      provide: SportsCar.name,
      useFactory: (container: Container) =>
        new SportsCar(container.get(Engine.name)),
    },
    { provide: Car.name, useExisting: SportsCar.name },
  ]);
  const car = needle.get(Car.name);
  const sportsCar = needle.get(SportsCar.name);

  expect(car).toBeInstanceOf(SportsCar);
  expect(car).toBe(sportsCar);
});

test('Needle resolve aliases correctly when container is reinitialized', () => {
  const needle = new Needle([
    { provide: Engine.name, useClass: Engine },
    { provide: TurboEngine.name, useExisting: Engine.name },
  ]);

  needle.initialize([{ provide: 'Turbo', useExisting: TurboEngine.name }]);

  expect(needle.get('Turbo')).toBeInstanceOf(Engine);
});

test('Needle resolves circular aliases correctly', () => {
  const needle = new Needle([
    { provide: TurboEngine.name, useClass: TurboEngine },
    { provide: Engine.name, useExisting: TurboEngine.name },
    { provide: 'Turbo', useExisting: Engine.name },
  ]);

  expect(needle.get('Turbo')).toBe(needle.get(Engine.name));
});

test('Needle throws for aliases to non-existent providers', () => {
  const needle = new Needle([
    { provide: Car.name, useExisting: 'NonExisting' },
  ]);

  expect(() => needle.get(Car.name)).toThrow(
    'No provider for "NonExisting" was found; are you certain you provided it during configuration?',
  );
});

test('Needle throws for chained aliases to non-existent providers', () => {
  const needle = new Needle([
    { provide: SportsCar.name, useExisting: 'NonExisting' },
    { provide: Car.name, useExisting: SportsCar.name },
  ]);

  expect(() => needle.get(Car.name)).toThrow(
    'No provider for "NonExisting" was found; are you certain you provided it during configuration?',
  );
});

test('Needle throws for conflicting aliases to non-existent providers', () => {
  const needle = new Needle([
    { provide: Engine.name, useExisting: TurboEngine.name },
    { provide: TurboEngine.name, useExisting: 'NonExisting' },
  ]);

  expect(() => needle.get(Engine.name)).toThrow(
    'No provider for "NonExisting" was found; are you certain you provided it during configuration?',
  );
  expect(() => needle.get(TurboEngine.name)).toThrow(
    'No provider for "NonExisting" was found; are you certain you provided it during configuration?',
  );
});

test('Needle throws for aliases with undefined token', () => {
  expect(
    () => new Needle([{ provide: Engine.name, useExisting: undefined }]),
  ).toThrow(
    'Invalid provider definition detected; only instances of Provider are allowed, got: [{"provide":"Engine"}].',
  );
});

test('Needle supports overriding factory dependencies', () => {
  const needle = new Needle([
    { provide: Engine.name, useClass: Engine },
    {
      provide: SportsCar.name,
      useFactory: (container: Container) =>
        new SportsCar(container.get(Engine.name)),
    },
  ]);
  const sportsCar = needle.get<SportsCar>(SportsCar.name);

  expect(sportsCar).toBeInstanceOf(SportsCar);
  expect(sportsCar.engine).toBeInstanceOf(Engine);
});

test('Needle handles optional dependencies gracefully', () => {
  const needle = new Needle([
    {
      provide: CarWithOptionalEngine.name,
      useFactory: (container: Container) => new CarWithOptionalEngine(),
    },
  ]);
  const car = needle.get<CarWithOptionalEngine>(CarWithOptionalEngine.name);

  expect(car.engine).toBeUndefined();
});

test('Needle prioritizes the last provider for a given token', () => {
  const needle = new Needle([
    { provide: Engine.name, useClass: Engine },
    { provide: Engine.name, useClass: TurboEngine },
  ]);

  expect(needle.get(Engine.name)).toBeInstanceOf(TurboEngine);
});

test('Needle resolves chained dependencies correctly', () => {
  const needle = new Needle([
    {
      provide: CarWithDashboard.name,
      useFactory: (container: Container) =>
        new CarWithDashboard(
          container.get(Engine.name),
          container.get(Dashboard.name),
        ),
    },
    { provide: Engine.name, useClass: Engine },
    {
      provide: Dashboard.name,
      useFactory: (container: Container) =>
        new Dashboard(container.get(DashboardSoftware.name)),
    },
    { provide: DashboardSoftware.name, useClass: DashboardSoftware },
  ]);
  const car = needle.get<CarWithDashboard>(CarWithDashboard.name);

  expect(car).toBeInstanceOf(CarWithDashboard);
  expect(car.engine).toBeInstanceOf(Engine);
  expect(car.dashboard).toBeInstanceOf(Dashboard);
});

test('Needle throws when chained dependencies are incomplete', () => {
  const needle = new Needle([
    {
      provide: CarWithDashboard.name,
      useFactory: (container: Container) =>
        new CarWithDashboard(
          container.get(Engine.name),
          container.get(Dashboard.name),
        ),
    },
    { provide: Engine.name, useClass: Engine },
    {
      provide: Dashboard.name,
      useFactory: (container: Container) =>
        new Dashboard(container.get(DashboardSoftware.name)),
    },
    // missing DashboardSoftware provider
  ]);

  expect(() => needle.get(CarWithDashboard.name)).toThrow(
    'No provider for "DashboardSoftware" was found; are you certain you provided it during configuration?',
  );
});

test('Needle throws for undefined providers', () => {
  const needle = new Needle();

  expect(() => needle.get('NonExisting')).toThrow(
    'No provider for "NonExisting" was found; are you certain you provided it during configuration?',
  );
  expect(() => needle.get(Symbol('NonExisting'))).toThrow(
    'No provider for "Symbol(NonExisting)" was found; are you certain you provided it during configuration?',
  );
});

test('Needle throws for invalid provider definitions', () => {
  expect(() => new Needle(<any>[<any>'blah'])).toThrow(
    'Invalid provider definition detected; only instances of Provider are allowed, got: [blah].',
  );
});

test('Needle throws for invalid classes', () => {
  expect(
    () => new Needle([{ provide: Engine.name, useClass: <any>'blah' }]),
  ).toThrow('Unable to instantiate class (blah is not constructable).');
});

test('Needle throws for invalid class constructors', () => {
  expect(() => new Needle([{ provide: Car.name, useClass: <any>Car }])).toThrow(
    'Invalid class constructor "Car"; expected a defult (no-argument) constructor.',
  );
});

test('Needle throws for invalid factory', () => {
  const needle = new Needle([{ provide: Car.name, useFactory: <any>'abc' }]);
  expect(() => needle.get(Car.name)).toThrow(
    'Invalid factory provided; expected a function, but "string" was received.',
  );
});

test('Needle throws for cyclic aliases', () => {
  expect(
    () => new Needle([{ provide: Engine.name, useExisting: Engine.name }]),
  ).toThrow(
    'Cycle detected within the aliases definitions:\n Engine -> Engine\n',
  );
});

test('Needle throws for cyclic alias chains', () => {
  expect(
    () =>
      new Needle([
        { provide: TurboEngine.name, useClass: TurboEngine },
        { provide: Engine.name, useExisting: TurboEngine.name },
        { provide: TurboEngine.name, useExisting: Engine.name },
      ]),
  ).toThrow(
    'Cycle detected within the aliases definitions:\n Engine -> TurboEngine -> Engine\n',
  );
});

test('Needle correctly identifies existing providers', () => {
  const needle = new Needle([
    { provide: String.name, useValue: 'Hello' },
    { provide: Engine.name, useClass: Engine },
    {
      provide: SportsCar.name,
      useFactory: (container: Container) =>
        new SportsCar(container.get(Engine.name)),
    },
    { provide: Car.name, useExisting: SportsCar.name },
  ]);

  expect(needle.has(String.name)).toBe(true); // service
  expect(needle.has(Engine.name)).toBe(true); // class
  expect(needle.has(SportsCar.name)).toBe(true); // factory
  expect(needle.has(Car.name)).toBe(true); // alias
});

test('Needle handles aliases consistently in `has()`', () => {
  const needle = new Needle([
    { provide: TurboEngine.name, useValue: TurboEngine },
    { provide: Engine.name, useExisting: TurboEngine.name },
  ]);

  expect(needle.has(Engine.name)).toBe(true);
});

test('Needle correctly identifies non-existent providerst', () => {
  const needle = new Needle();

  expect(needle.has('NonExisting')).toBe(false);
});

test('Needle rethrows errors from provider constructors (useClass)', () => {
  const needle = new Needle([
    { provide: BrokenEngine.name, useClass: BrokenEngine },
  ]);
  expect(() => needle.get(BrokenEngine.name)).toThrow(
    'Service for "BrokenEngine" could not be created. Reason: Broken Engine',
  );
});

test('Needle rethrows errors from provider constructors (useFactory)', () => {
  const needle = new Needle([
    {
      provide: BrokenEngine.name,
      useFactory: (container: Container) => new BrokenEngine(),
    },
  ]);
  expect(() => needle.get(BrokenEngine.name)).toThrow(
    'Service for "BrokenEngine" could not be created. Reason: Broken Engine',
  );
});

test('Needle adds value providers correctly', () => {
  const needle = new Needle();
  needle.addProvider({ provide: String.name, useValue: 'Hello' });

  expect(needle.get(String.name)).toEqual('Hello');
});

test('Needle adds class providers correctly', () => {
  const needle = new Needle();
  needle.addProvider({ provide: Engine.name, useClass: TurboEngine });
  const engine: Engine = needle.get(Engine.name);

  expect(engine instanceof TurboEngine).toBe(true);
});

test('Needle adds factory providers correctly', () => {
  const needle = new Needle();
  needle.addProvider({
    provide: Engine.name,
    useClass: Engine,
  });
  needle.addProvider({
    provide: Car.name,
    useFactory: (container: Container) =>
      new SportsCar(container.get(Engine.name)),
  });
  const car: Car = needle.get(Car.name);

  expect(car instanceof SportsCar).toBe(true);
});

test('Needle adds alias providers correctly', () => {
  const needle = new Needle();
  needle.addProvider({
    provide: TurboEngine.name,
    useClass: TurboEngine,
  });
  needle.addProvider({
    provide: Engine.name,
    useExisting: TurboEngine.name,
  });

  expect(needle.get(Engine.name)).toBe(needle.get(TurboEngine.name));
});

test('Needle throws for invalid providers', () => {
  expect(() => new Needle().addProvider(<any>'blah')).toThrow(
    'Invalid provider definition detected; only instances of Provider are allowed, got: [blah].',
  );
  expect(() => new Needle().addProvider(<any>{})).toThrow(
    'Invalid provider definition detected; only instances of Provider are allowed, got: [{}].',
  );
});

test('Needle throws for cyclic chains of aliases', () => {
  expect(() => {
    const needle = new Needle([]);
    needle.addProvider({
      provide: 'TurboEngine',
      useValue: 'TurboEngine',
    });

    needle.addProvider({
      provide: 'TurboEngine',
      useExisting: 'TurboEngine',
    });
  }).toThrow(
    'Cycle detected within the aliases definitions:\n TurboEngine -> TurboEngine\n',
  );
});
