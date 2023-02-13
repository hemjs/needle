import { Container } from '@hemtypes/container';
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

test('should return an instance of Needle', () => {
  const needle = new Needle([]);
  expect(needle).toBeInstanceOf(Needle);
});

test('should instantiate a class without dependencies', () => {
  const needle = new Needle([{ provide: Engine.name, useClass: Engine }]);
  const engine = needle.get(Engine.name);

  expect(engine).toBeInstanceOf(Engine);
});

test('should resolve dependencies based on the constructor', () => {
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

test('should cache instances', () => {
  const needle = new Needle([{ provide: Engine.name, useClass: Engine }]);

  const a1 = needle.get(Engine.name);
  const a2 = needle.get(Engine.name);

  expect(a1).toBe(a2);
});

test('should provide to a value', () => {
  const needle = new Needle([
    { provide: Engine.name, useValue: 'fake engine' },
  ]);
  const engine = needle.get(Engine.name);

  expect(engine).toEqual('fake engine');
});

test('should provide to a factory', () => {
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

test('should supporting provider to null', () => {
  const needle = new Needle([{ provide: Engine.name, useValue: null }]);
  const engine = needle.get(Engine.name);

  expect(engine).toBeNull();
});

test('should provide to an alias', () => {
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

test('should throw when the aliased provider does not exist', () => {
  const needle = new Needle([{ provide: 'car', useExisting: SportsCar }]);

  expect(() => needle.get('car')).toThrowError();
});

test('should support overriding factory dependencies', () => {
  const needle = new Needle([
    { provide: Engine.name, useClass: Engine },
    {
      provide: Car.name,
      useFactory: (container: Container) =>
        new SportsCar(container.get(Engine.name)),
    },
  ]);
  const car = needle.get<Car>(Car.name);

  expect(car).toBeInstanceOf(SportsCar);
  expect(car.engine).toBeInstanceOf(Engine);
});

test('should support optional dependencies', () => {
  const needle = new Needle([
    {
      provide: CarWithOptionalEngine.name,
      useFactory: (container: Container) =>
        new CarWithOptionalEngine(<any>null),
    },
  ]);
  const car = needle.get<CarWithOptionalEngine>(CarWithOptionalEngine.name);

  expect(car.engine).toEqual(null);
});

test('should use the last provider when there are multiple providers for same token', () => {
  const needle = new Needle([
    { provide: Engine.name, useClass: Engine },
    { provide: Engine.name, useClass: TurboEngine },
  ]);

  expect(needle.get(Engine.name)).toBeInstanceOf(TurboEngine);
});

test('should resolve when chain dependencies', () => {
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

test('should throw when missing chain dependencies', () => {
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
    // missing 'DashboardSoftware'
  ]);

  expect(() => needle.get(CarWithDashboard.name)).toThrowError(
    'No provider for "DashboardSoftware" was found; are you certain you provided it during configuration?',
  );
});

test('should throw when invalid provider definition', () => {
  try {
    new Needle(<any>[<any>'blah']);
  } catch (error: any) {
    expect(error.message).toBe(
      'An invalid provider definition has been detected; only instances of Provider are allowed, got: [blah].',
    );
  }
});

test('should throw when invalid class', () => {
  try {
    new Needle([{ provide: Engine.name, useClass: <any>Engine.name }]);
  } catch (error: any) {
    expect(error.message).toBe(
      'Unable to instantiate class (Engine is not constructable).',
    );
  }
});

test('should throw when invalid class type', () => {
  try {
    new Needle([{ provide: Car.name, useClass: <any>Car }]);
  } catch (error: any) {
    expect(error.message).toBe(
      'An invalid class, "Car", was provided; expected a defult (no-argument) constructor.',
    );
  }
});

test('should throw when cyclic aliases detetected', () => {
  try {
    new Needle([
      { provide: TurboEngine.name, useClass: TurboEngine },
      { provide: Engine.name, useExisting: TurboEngine.name },
      { provide: TurboEngine.name, useExisting: Engine.name },
    ]);
  } catch (error: any) {
    expect(error.message).toBe(
      'A cycle has been detected within the aliases definitions:\n Engine -> TurboEngine -> Engine\n',
    );
  }
});

test('should throw when no provider defined', () => {
  const needle = new Needle([]);

  expect(() => needle.get('NonExisting')).toThrowError(
    'Service for "NonExisting" could not be created. Reason: No provider for "NonExisting" was found; are you certain you provided it during configuration?',
  );
});

test('should return true when provider exist', () => {
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

test('should return false when provider does not exist', () => {
  const needle = new Needle([]);

  expect(needle.has('NonExisting')).toBe(false);
});

test('shoul fail to instantiate when error happens in a constructor', () => {
  try {
    new Needle([{ provide: Engine.name, useClass: BrokenEngine }]);
  } catch (error: any) {
    expect(error.message).toContain('Broken Engine');
  }
});

test('should add a single value provider', () => {
  const needle = new Needle([]);
  needle.addProvider({ provide: String.name, useValue: 'Hello' });

  expect(needle.get(String.name)).toEqual('Hello');
});

test('should add a single class provider', () => {
  const needle = new Needle([]);
  needle.addProvider({ provide: Engine.name, useClass: TurboEngine });
  const engine: Engine = needle.get(Engine.name);

  expect(engine instanceof TurboEngine).toBe(true);
});

test('should add a single factory provider', () => {
  const needle = new Needle([]);
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

test('should add a single alias provider', () => {
  const needle = new Needle([]);
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

test('should throw when given invalid single provider', () => {
  expect(() => new Needle([]).addProvider(<any>'blah')).toThrowError(
    'An invalid provider definition has been detected; only instances of Provider are allowed, got: [blah].',
  );
});

test('should throw when single provider cyclic aliases detetected', () => {
  try {
    const needle = new Needle([]);
    needle.addProvider({
      provide: TurboEngine.name,
      useClass: TurboEngine,
    });
    needle.addProvider({
      provide: TurboEngine.name,
      useExisting: Engine.name,
    });
  } catch (error: any) {
    expect(error.message).toBe(
      'A cycle has been detected within the aliases definitions:\n Engine -> TurboEngine -> Engine\n',
    );
  }
});
