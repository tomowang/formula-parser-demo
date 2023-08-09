grammar formula;

expression
    : '-' expression
    | additionalExpression;

additionalExpression
    : multiplicationExpression (additionalOperator multiplicationExpression)?;

additionalOperator
    : '+' | '-';

multiplicationExpression
    : atomicExpression (multiplicationOperator additionalExpression)?;

multiplicationOperator
    : '*' | '/';

atomicExpression
    : parenthesisExpression | NumberLiteral | formulaExpression;

parenthesisExpression
    : LParen expression RParen;

LParen
    : '(';

RParen
    : ')';

NumberLiteral
    : ('0' .. '9') + ('.' ('0' .. '9') +)? ;

formulaExpression
    : FormulaLiteral LParen ReferenceLiteral RParen;

FormulaLiteral
    : 'SUM' | 'AVG' | 'MAX' | 'MIN';

ReferenceLiteral
    : ('a' .. 'z' | 'A' .. 'Z' | '_' | '0' .. '9') + ;
