from dataclasses import dataclass
from enum import Enum, auto


class TokenType(Enum):
    # DSL keywords
    WORKFLOW = auto()
    TASK = auto()
    IF = auto()
    ELSE = auto()
    END = auto()
    USING = auto()
    AI = auto()

    # Comparison Operators
    GTE = auto()  # >=
    LTE = auto()  # <=
    EQ = auto()   # ==
    NEQ = auto()  # !=
    GT = auto()   # >
    LT = auto()   # <

    # Literals and General tokens
    NUMBER = auto()
    IDENTIFIER = auto()
    NEWLINE = auto()
    EOF = auto()


@dataclass(frozen=True)
class Token:
    type: TokenType
    value: str
    line: int
    column: int

    def to_dict(self) -> dict:
        return {
            "type": self.type.name,
            "value": self.value,
            "line": self.line,
            "column": self.column,
        }
