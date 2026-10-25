from .ast_nodes import IfNode, TaskNode, WorkflowNode
from .tokens import Token, TokenType


class ParserError(Exception):
    def __init__(self, message: str, line: int, column: int):
        super().__init__(message)
        self.line = line
        self.column = column


class Parser:
    def __init__(self, tokens: list[Token]):
        self.tokens = tokens
        self.pos = 0

    def current(self) -> Token:
        if self.pos < len(self.tokens):
            return self.tokens[self.pos]
        return Token(TokenType.EOF, "", 0, 0)

    def advance(self) -> Token:
        token = self.current()
        if self.pos < len(self.tokens):
            self.pos += 1
        return token

    def expect(self, token_type: TokenType) -> Token:
        token = self.current()
        if token.type != token_type:
            raise ParserError(
                f"Expected {token_type.name}, got {token.type.name}",
                token.line,
                token.column,
            )
        self.advance()
        return token

    def skip_newlines(self):
        while self.current().type == TokenType.NEWLINE:
            self.advance()

    def parse_statements(self, stop_types: set[TokenType] | None = None) -> list:
        if stop_types is None:
            stop_types = {TokenType.EOF}
        statements = []
        self.skip_newlines()
        while self.current().type not in stop_types:
            token = self.current()
            if token.type == TokenType.TASK:
                statements.append(self.parse_task())
            elif token.type == TokenType.IF:
                statements.append(self.parse_if())
            elif token.type == TokenType.NEWLINE:
                self.advance()
            else:
                raise ParserError(
                    f"Unexpected token {token.value}",
                    token.line,
                    token.column,
                )
            self.skip_newlines()
        return statements

    def parse_task(self) -> TaskNode:
        start = self.expect(TokenType.TASK)
        name = self.expect(TokenType.IDENTIFIER)
        if self.current().type not in (
            TokenType.NEWLINE,
            TokenType.EOF,
        ):
            token = self.current()
            raise ParserError(
                "Unexpected token after task name",
                token.line,
                token.column,
            )
        return TaskNode(name=name.value, line=start.line)

    COMPARISON_OPS = {
        TokenType.GT,
        TokenType.LT,
        TokenType.GTE,
        TokenType.LTE,
        TokenType.EQ,
        TokenType.NEQ,
    }

    def parse_condition(self) -> str:
        left = self.expect(TokenType.IDENTIFIER)
        if self.current().type in self.COMPARISON_OPS:
            op = self.advance()
            if self.current().type not in (TokenType.NUMBER, TokenType.IDENTIFIER):
                token = self.current()
                raise ParserError(
                    f"Expected number or identifier after comparison operator '{op.value}'",
                    token.line,
                    token.column,
                )
            right = self.advance()
            return f"{left.value} {op.value} {right.value}"
        return left.value

    def parse_if(self) -> IfNode:
        start = self.expect(TokenType.IF)
        condition_str = self.parse_condition()
        if self.current().type not in (
            TokenType.NEWLINE,
            TokenType.EOF,
        ):
            token = self.current()
            raise ParserError(
                "Expected end of IF condition",
                token.line,
                token.column,
            )
        self.skip_newlines()
        then_body = self.parse_statements(
            stop_types={
                TokenType.ELSE,
                TokenType.END,
                TokenType.EOF,
            }
        )
        else_body = []
        if self.current().type == TokenType.ELSE:
            self.advance()
            self.skip_newlines()
            else_body = self.parse_statements(
                stop_types={
                    TokenType.END,
                    TokenType.EOF,
                }
            )
        self.expect(TokenType.END)
        if self.current().type == TokenType.NEWLINE:
            self.skip_newlines()
        return IfNode(
            condition=condition_str,
            then_body=then_body,
            else_body=else_body,
            line=start.line,
        )

    def parse(self, require_end: bool = False) -> WorkflowNode:
        self.skip_newlines()
        start = self.expect(TokenType.WORKFLOW)
        name = self.expect(TokenType.IDENTIFIER)
        if self.current().type not in (
            TokenType.NEWLINE,
            TokenType.EOF,
        ):
            token = self.current()
            raise ParserError(
                "Expected newline after workflow name",
                token.line,
                token.column,
            )
        self.skip_newlines()
        body = self.parse_statements(stop_types={TokenType.EOF, TokenType.END})
        if self.current().type == TokenType.END:
            self.advance()
            self.skip_newlines()
        elif require_end:
            token = self.current()
            raise ParserError(
                "Expected END to close WORKFLOW definition",
                token.line,
                token.column,
            )
        self.expect(TokenType.EOF)
        return WorkflowNode(name=name.value, body=body, line=start.line)


def parse_tokens(tokens: list[Token], require_end: bool = False) -> WorkflowNode:
    parser = Parser(tokens)
    return parser.parse(require_end=require_end)
