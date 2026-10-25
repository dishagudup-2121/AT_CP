import re
from .tokens import Token, TokenType

KEYWORDS = {
    "WORKFLOW": TokenType.WORKFLOW,
    "TASK": TokenType.TASK,
    "IF": TokenType.IF,
    "ELSE": TokenType.ELSE,
    "END": TokenType.END,
    "USING": TokenType.USING,
    "AI": TokenType.AI,
}

TOKEN_PATTERN = re.compile(
    r"(?P<WHITESPACE>[ \t]+)"
    r"|(?P<COMMENT>\#[^\r\n]*)"
    r"|(?P<GTE>>=)"
    r"|(?P<LTE><=)"
    r"|(?P<EQ>==)"
    r"|(?P<NEQ>!=)"
    r"|(?P<GT>>)"
    r"|(?P<LT><)"
    r"|(?P<NUMBER>[0-9]+(?:\.[0-9]+)?)"
    r"|(?P<IDENTIFIER>[A-Za-z_][A-Za-z0-9_]*)"
    r"|(?P<INVALID>.)"
)


class LexerError(Exception):
    def __init__(self, message: str, line: int, column: int):
        super().__init__(message)
        self.line = line
        self.column = column


def tokenize(source: str) -> list[Token]:
    tokens: list[Token] = []
    line = 1
    line_start = 0
    position = 0

    while position < len(source):
        # Handle CRLF and LF newlines
        if source[position : position + 2] == "\r\n":
            tokens.append(
                Token(
                    TokenType.NEWLINE,
                    "\n",
                    line,
                    position - line_start,
                )
            )
            line += 1
            position += 2
            line_start = position
            continue

        if source[position] == "\n":
            tokens.append(
                Token(
                    TokenType.NEWLINE,
                    "\n",
                    line,
                    position - line_start,
                )
            )
            line += 1
            position += 1
            line_start = position
            continue

        if source[position] == "\r":
            tokens.append(
                Token(
                    TokenType.NEWLINE,
                    "\n",
                    line,
                    position - line_start,
                )
            )
            line += 1
            position += 1
            line_start = position
            continue

        match = TOKEN_PATTERN.match(source, position)
        if not match:
            column = position - line_start + 1
            raise LexerError(f"Unexpected character: {source[position]!r}", line, column)

        kind = match.lastgroup
        value = match.group()
        column = position - line_start + 1

        if kind == "WHITESPACE" or kind == "COMMENT":
            pass
        elif kind == "IDENTIFIER":
            token_type = KEYWORDS.get(value.upper(), TokenType.IDENTIFIER)
            tokens.append(Token(token_type, value, line, column))
        elif kind == "NUMBER":
            tokens.append(Token(TokenType.NUMBER, value, line, column))
        elif kind in ("GTE", "LTE", "EQ", "NEQ", "GT", "LT"):
            tokens.append(Token(TokenType[kind], value, line, column))
        elif kind == "INVALID":
            raise LexerError(f"Unexpected character: {value!r}", line, column)

        position = match.end()

    tokens.append(
        Token(
            TokenType.EOF,
            "",
            line,
            position - line_start + 1,
        )
    )
    return tokens
