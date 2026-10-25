import sys
from pathlib import Path

# Add backend directory to sys.path so app can be imported when running pytest from root
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import pytest
from app.compiler.lexer import LexerError, tokenize
from app.compiler.tokens import TokenType


def test_workflow_keywords():
    tokens = tokenize("WORKFLOW Demo\nTASK Search\n")
    assert tokens[0].type == TokenType.WORKFLOW
    assert tokens[1].type == TokenType.IDENTIFIER
    assert tokens[1].value == "Demo"
    assert tokens[3].type == TokenType.TASK
    assert tokens[4].value == "Search"
    assert tokens[-1].type == TokenType.EOF


def test_keywords_are_case_insensitive():
    tokens = tokenize("workflow Demo")
    assert tokens[0].type == TokenType.WORKFLOW
    assert tokens[1].value == "Demo"


def test_comments_are_ignored():
    tokens = tokenize("TASK Search # run search")
    assert [token.value for token in tokens] == [
        "TASK",
        "Search",
        "",
    ]


def test_invalid_character():
    with pytest.raises(LexerError) as exc_info:
        tokenize("WORKFLOW Demo @")
    assert exc_info.value.line == 1
    assert exc_info.value.column == 15


def test_comparison_and_number_tokens():
    tokens = tokenize("IF confidence >= 0.8")
    types = [t.type for t in tokens]
    assert types == [
        TokenType.IF,
        TokenType.IDENTIFIER,
        TokenType.GTE,
        TokenType.NUMBER,
        TokenType.EOF,
    ]
    assert tokens[2].value == ">="
    assert tokens[3].value == "0.8"
