import sys
from pathlib import Path

# Add backend directory to sys.path so app can be imported when running pytest from root
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import pytest
from app.compiler.lexer import tokenize
from app.compiler.parser import parse_tokens, ParserError


def test_parse_simple_workflow():
    source = "WORKFLOW Demo\nTASK Search\nTASK Analyze\n"
    ast = parse_tokens(tokenize(source))
    assert ast.name == "Demo"
    assert len(ast.body) == 2
    assert ast.body[0].name == "Search"
    assert ast.body[1].name == "Analyze"


def test_parse_conditional():
    source = (
        "WORKFLOW Demo\n"
        "IF Success\n"
        "TASK Publish\n"
        "ELSE\n"
        "TASK Retry\n"
        "END\n"
    )
    ast = parse_tokens(tokenize(source))
    condition = ast.body[0]
    assert condition.condition == "Success"
    assert condition.then_body[0].name == "Publish"
    assert condition.else_body[0].name == "Retry"


def test_missing_end_raises_error():
    source = (
        "WORKFLOW Demo\n"
        "IF Success\n"
        "TASK Publish\n"
    )
    with pytest.raises(ParserError):
        parse_tokens(tokenize(source))


def test_unexpected_token_raises_error():
    source = "WORKFLOW Demo\nTASK Search unexpected\n"
    with pytest.raises(ParserError):
        parse_tokens(tokenize(source))


def test_parse_comparison_conditional():
    source = (
        "WORKFLOW ContentModeration\n"
        "TASK Search\n"
        "IF confidence > 0.8\n"
        "TASK Publish\n"
        "ELSE\n"
        "TASK Retry\n"
        "END\n"
        "END"
    )
    ast = parse_tokens(tokenize(source), require_end=True)
    assert ast.name == "ContentModeration"
    assert len(ast.body) == 2
    assert ast.body[0].name == "Search"
    if_node = ast.body[1]
    assert if_node.condition == "confidence > 0.8"
    assert if_node.then_body[0].name == "Publish"
    assert if_node.else_body[0].name == "Retry"
