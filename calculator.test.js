import {expect, test} from 'vitest';
import { CalculatorLexer, CalculatorInterpreter, parser, defaultRuleName } from "./calculator.js";

const visitor = new CalculatorInterpreter();

function parse(lexResult, startRuleName) {
  parser.reset();
  parser.input = lexResult.tokens;
  let value = parser[startRuleName]();
  return { value: value, errors: parser.errors };
}

function evaluate(text) {
  let lexResult = CalculatorLexer.tokenize(text);
  let parseResult = parse(lexResult, defaultRuleName);
  if (parseResult.errors.length > 0) {
    return new Error(parseResult.errors);
  }
  let result = visitor.visit(parseResult.value);
  return result;
}


const testData = [{
  message: 'negivate number',
  calc: '-1',
  value: -1
}, {
  message: 'basic add',
  calc: '1+2',
  value: 3
}, {
  message: 'basic minus',
  calc: '1-2',
  value: -1
}, {
  message: 'basic multi',
  calc: '1 * 2',
  value: 2
}, {
  message: 'basic div',
  calc: '10 / 5',
  value: 2
}, {
  message: 'paren',
  calc: '(1+2)*3',
  value: 9
}, {
  message: 'negivate with paren',
  calc: '-(1+2)',
  value: -3
}]

for (const data of testData) {
  const {message, calc, value} = data;
  test(message, () => {
    expect(evaluate(calc)).toBe(value);
  });
}

test('expect error', () => {
  expect(evaluate('abc')).toBeInstanceOf(Error);
});
