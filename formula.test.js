import {expect, test} from 'vitest';
import {FormulaLexer, FormulaInterpreter, parser, defaultRuleName} from './formula.js';

const data = {
  'column1': [2, 3],
  'column2': [4, 6],
  'column3': [],
};


const visitor = new FormulaInterpreter(data);

function parse(lexResult, startRuleName) {
  parser.reset();
  parser.input = lexResult.tokens;
  const value = parser[startRuleName]();
  return { value: value, errors: parser.errors };
}

function evaluate(text) {
  const lexResult = FormulaLexer.tokenize(text);
  const parseResult = parse(lexResult, defaultRuleName);
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
}, {
  message: 'basic formula sum',
  calc: 'SUM(column1)',
  value: 5
}, {
  message: 'basic formula avg',
  calc: 'AVG(column1)',
  value: 2.5
}, {
  message: 'basic formula max',
  calc: 'MAX(column1)',
  value: 3
}, {
  message: 'basic formula min',
  calc: 'MIN(column1)',
  value: 2
}, {
  message: 'mixture',
  calc: 'SUM(column1) / SUM(column2)',
  value: 0.5
}, {
  message: 'mixture with other operators',
  calc: '(SUM(column1) / SUM(column2)) * 100',
  value: 50
}]

for (const data of testData) {
  const {message, calc, value} = data;
  test(message, () => {
    expect(evaluate(calc)).toBe(value);
  });
}

test('expect `Empty reference` error', () => {
  expect(() => evaluate('SUM(column3)')).toThrow('Empty reference: column3');
});

test('expect `Unknown reference` error', () => {
  expect(() => evaluate('SUM(column4)')).toThrow('Unknown reference: column4');
});
