import sys
from pathlib import Path

# Add backend directory to sys.path so app can be imported when running pytest from root
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.compiler.lexer import tokenize
from app.compiler.parser import parse_tokens
from app.compiler.semantic import analyze_workflow


def compile_to_ast(source: str):
    return parse_tokens(tokenize(source))


def test_valid_workflow_has_no_semantic_errors():
    source = (
        "WORKFLOW ResearchPipeline\n"
        "TASK Search\n"
        "TASK Analyze\n"
        "IF Success\n"
        "TASK Publish\n"
        "ELSE\n"
        "TASK Retry\n"
        "END\n"
    )
    ast = compile_to_ast(source)
    assert analyze_workflow(ast) == []


def test_unknown_task_is_rejected():
    source = "WORKFLOW Demo\nTASK UnknownTask\n"
    ast = compile_to_ast(source)
    errors = analyze_workflow(ast)
    assert len(errors) == 1
    assert "Unknown task" in errors[0].message


def test_unknown_condition_is_rejected():
    source = (
        "WORKFLOW Demo\n"
        "IF UnknownCondition\n"
        "TASK Search\n"
        "END\n"
    )
    ast = compile_to_ast(source)
    errors = analyze_workflow(ast)
    assert len(errors) == 1
    assert "Unknown condition" in errors[0].message


def test_comparison_condition_is_accepted():
    source = (
        "WORKFLOW Demo\n"
        "IF confidence > 0.8\n"
        "TASK Publish\n"
        "END\n"
    )
    ast = compile_to_ast(source)
    assert analyze_workflow(ast) == []


def test_unknown_variable_in_condition_is_rejected():
    source = (
        "WORKFLOW Demo\n"
        "IF unknown_metric > 0.8\n"
        "TASK Publish\n"
        "END\n"
    )
    ast = compile_to_ast(source)
    errors = analyze_workflow(ast)
    assert len(errors) == 1
    assert "Unknown condition variable" in errors[0].message
