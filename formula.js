import { createToken, tokenMatcher, Lexer, CstParser } from "chevrotain";
import _ from "lodash";

// using the NA pattern marks this Token class as 'irrelevant' for the Lexer.
// AdditionOperator defines a Tokens hierarchy but only the leafs in this hierarchy define
// actual Tokens that can appear in the text
const AdditionOperator = createToken({
  name: "AdditionOperator",
  pattern: Lexer.NA,
});
const Plus = createToken({
  name: "Plus",
  pattern: /\+/,
  categories: AdditionOperator,
});
const Minus = createToken({
  name: "Minus",
  pattern: /-/,
  categories: AdditionOperator,
});

const MultiplicationOperator = createToken({
  name: "MultiplicationOperator",
  pattern: Lexer.NA,
});
const Multi = createToken({
  name: "Multi",
  pattern: /\*/,
  categories: MultiplicationOperator,
});
const Div = createToken({
  name: "Div",
  pattern: /\//,
  categories: MultiplicationOperator,
});

const LParen = createToken({ name: "LParen", pattern: /\(/ });
const RParen = createToken({ name: "RParen", pattern: /\)/ });

const NumberLiteral = createToken({
  name: "NumberLiteral",
  pattern: /(0|[1-9]\d*)(\.\d+)?/,
});

const ReferenceLiteral = createToken({
  name: "ReferenceLiteral",
  pattern: /\w+/,
});

const FormulaLiteral = createToken({
  name: "FormulaLiteral",
  pattern: Lexer.NA,
});
const Sum = createToken({
  name: "Sum",
  pattern: /SUM/,
  categories: FormulaLiteral,
});
const Avg = createToken({
  name: "Avg",
  pattern: /AVG/,
  categories: FormulaLiteral,
});
const Max = createToken({
  name: "Max",
  pattern: /MAX/,
  categories: FormulaLiteral,
});
const Min = createToken({
  name: "Min",
  pattern: /MIN/,
  categories: FormulaLiteral,
});


// marking WhiteSpace as 'SKIPPED' makes the lexer skip it.
const WhiteSpace = createToken({
  name: "WhiteSpace",
  pattern: /\s+/,
  group: Lexer.SKIPPED,
});

const allTokens = [
  WhiteSpace, // whitespace is normally very common so it should be placed first to speed up the lexer's performance
  Plus,
  Minus,
  Multi,
  Div,
  LParen,
  RParen,
  NumberLiteral,
  AdditionOperator,
  MultiplicationOperator,
  Sum,
  Avg,
  Max,
  Min,
  FormulaLiteral,
  ReferenceLiteral,
];

const FormulaLexer = new Lexer(allTokens);

class FormulaParser extends CstParser{
  constructor() {
    super(allTokens);

    const $ = this;

    $.RULE("expression", () => {
      $.OR([
        { ALT: () => $.SUBRULE($.uminusExpression) },
        { ALT: () => $.SUBRULE($.additionExpression) },
      ]);
    });

    $.RULE("uminusExpression", () => {
      $.CONSUME(Minus);
      $.SUBRULE($.expression);
    });

    //  lowest precedence thus it is first in the rule chain
    // The precedence of binary expressions is determined by how far down the Parse Tree
    // The binary expression appears.
    $.RULE("additionExpression", () => {
      $.SUBRULE($.multiplicationExpression, { LABEL: "lhs" });
      $.MANY(() => {
        // consuming 'AdditionOperator' will consume either Plus or Minus as they are subclasses of AdditionOperator
        $.CONSUME(AdditionOperator);
        //  the index "2" in SUBRULE2 is needed to identify the unique position in the grammar during runtime
        $.SUBRULE2($.multiplicationExpression, { LABEL: "rhs" });
      });
    });

    $.RULE("multiplicationExpression", () => {
      $.SUBRULE($.atomicExpression, { LABEL: "lhs" });
      $.MANY(() => {
        $.CONSUME(MultiplicationOperator);
        //  the index "2" in SUBRULE2 is needed to identify the unique position in the grammar during runtime
        $.SUBRULE2($.atomicExpression, { LABEL: "rhs" });
      });
    });

    $.RULE("formulaExpression", () => {
      $.CONSUME(FormulaLiteral, {LABEL: "formula"});
      $.CONSUME(LParen);
      $.CONSUME(ReferenceLiteral, {LABEL: "reference"});
      $.CONSUME(RParen);
    })

    $.RULE("atomicExpression", () =>
      $.OR([
        // parenthesisExpression has the highest precedence and thus it appears
        // in the "lowest" leaf in the expression ParseTree.
        { ALT: () => $.SUBRULE($.parenthesisExpression) },
        { ALT: () => $.CONSUME(NumberLiteral) },
        { ALT: () => $.SUBRULE($.formulaExpression) },
      ])
    );

    $.RULE("parenthesisExpression", () => {
      $.CONSUME(LParen);
      $.SUBRULE($.expression);
      $.CONSUME(RParen);
    });

    this.performSelfAnalysis();
  }
}

// wrapping it all together
// reuse the same parser instance.
const parser = new FormulaParser([]);
const defaultRuleName = 'expression';

// ----------------- Interpreter -----------------
const BaseCstVisitor = parser.getBaseCstVisitorConstructor();

class FormulaInterpreter extends BaseCstVisitor {
  constructor(data) {
    super();
    this.data = data;
    // This helper will detect any missing or redundant methods on this visitor
    this.validateVisitor();
  }

  expression(ctx) {
    if (ctx.additionExpression){
      return this.visit(ctx.additionExpression);
    } else { // uminus
      return this.visit(ctx.uminusExpression);
    }
  }

  uminusExpression(ctx) {
    return -1 * this.visit(ctx.expression);
  }

  additionExpression(ctx) {
    let result = this.visit(ctx.lhs);

    // "rhs" key may be undefined as the grammar defines it as optional (MANY === zero or more).
    if (ctx.rhs) {
      ctx.rhs.forEach((rhsOperand, idx) => {
        // there will be one operator for each rhs operand
        let rhsValue = this.visit(rhsOperand);
        let operator = ctx.AdditionOperator[idx];

        if (tokenMatcher(operator, Plus)) {
          result += rhsValue;
        } else {
          // Minus
          result -= rhsValue;
        }
      });
    }

    return result;
  }

  multiplicationExpression(ctx) {
    let result = this.visit(ctx.lhs);

    // "rhs" key may be undefined as the grammar defines it as optional (MANY === zero or more).
    if (ctx.rhs) {
      ctx.rhs.forEach((rhsOperand, idx) => {
        // there will be one operator for each rhs operand
        let rhsValue = this.visit(rhsOperand);
        let operator = ctx.MultiplicationOperator[idx];

        if (tokenMatcher(operator, Multi)) {
          result *= rhsValue;
        } else {
          // Division
          result /= rhsValue;
        }
      });
    }

    return result;
  }

  atomicExpression(ctx) {
    if (ctx.parenthesisExpression) {
      // passing an array to "this.visit" is equivalent
      // to passing the array's first element
      return this.visit(ctx.parenthesisExpression);
    } else if (ctx.NumberLiteral) {
      // If a key exists on the ctx, at least one element is guaranteed
      return parseFloat(ctx.NumberLiteral[0].image);
    } else if (ctx.formulaExpression) {
      return this.visit(ctx.formulaExpression);
    }
  }

  parenthesisExpression(ctx) {
    // The ctx will also contain the parenthesis tokens, but we don't care about those
    // in the context of calculating the result.
    return this.visit(ctx.expression);
  }

  formulaExpression(ctx) {
    let formula = ctx.formula[0];
    let reference = ctx.reference[0].image;
    let values = this.data[reference];
    if (tokenMatcher(formula, Sum)) {
      return _.sum(values);
    } else if (tokenMatcher(formula, Avg)) {
      return _.sum(values) / length(values);
    } else if (tokenMatcher(formula, Max)) {
      return _.max(values);
    } else if (tokenMatcher(formula, Min)) {
      return _.min(values);
    }
  }
}

export {FormulaLexer, FormulaParser, FormulaInterpreter, parser, defaultRuleName}
