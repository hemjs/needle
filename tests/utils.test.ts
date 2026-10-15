import { describe, expect, it } from 'vitest';

import { stringify } from '../src/utils.js';

function foo() {}

describe('stringify', () => {
  it('should return the same string for string inputs', () => {
    expect(stringify('abc')).toEqual('abc');
  });

  it('should return "null" for null values', () => {
    expect(stringify(null)).toEqual('null');
  });

  it('should return "undefined" for undefined values', () => {
    expect(stringify(undefined)).toEqual('undefined');
  });

  it('should return "true" for boolean true', () => {
    expect(stringify(true)).toBe('true');
  });

  it('should return "false" boolean false', () => {
    expect(stringify(false)).toBe('false');
  });

  it('should stringify symbols correctly', () => {
    expect(stringify(Symbol('abc'))).toBe('Symbol(abc)');
  });

  it('should return the function name for functions', () => {
    expect(stringify(foo)).toBe('foo');
  });

  it('should return the class name for classes', () => {
    expect(stringify(Date)).toBe('Date');
  });

  it('should stringify numbers correctly', () => {
    expect(stringify(123)).toBe('123');
  });

  it('should stringify arrays correctly', () => {
    expect(stringify([123, 456])).toBe('[123, 456]');
  });

  it('should not crash on objects without a prototype', () => {
    expect(stringify(Object.create(null))).toBe('{}');
  });

  it('should name anonymous functions and classes without their source', () => {
    expect(stringify(() => {})).toBe('(anonymous)');
    expect(stringify(class {})).toBe('(anonymous)');
  });

  it('should serialize objects, even ones with a name property', () => {
    expect(stringify({ name: 'Logger' })).toBe('{"name":"Logger"}');
    expect(stringify({ foo: 1 })).toBe('{"foo":1}');
  });

  it('should serialize class instances by their own properties', () => {
    class Config {
      port = 3000;
    }
    expect(stringify(new Config())).toBe('{"port":3000}');
  });

  it('should serialize objects inside arrays', () => {
    expect(stringify([{ provide: 'a' }, 'b'])).toBe('[{"provide":"a"}, b]');
  });

  it('should keep values that JSON drops or rejects', () => {
    const value: any = { token: Symbol('db'), factory: foo, size: 10n };
    value.self = value;
    expect(stringify(value)).toBe(
      '{"token":"Symbol(db)","factory":"foo","size":"10","self":"[Circular]"}',
    );
  });

  it('should stringify bigints', () => {
    expect(stringify(10n)).toBe('10');
  });
});
