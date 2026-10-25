# FlowScript Studio

> **Automata Theory & Compiler Design Course Project**  
> A Domain-Specific Language (DSL) compiler and Deterministic Finite Automaton (DFA) runtime engine with an interactive web studio.

---

## 📌 Executive Summary

**FlowScript Studio** is an educational, production-style software system designed for the Automata Theory & Formal Languages curriculum. It demonstrates the direct application of theoretical computer science concepts—regular languages, context-free grammars, recursive-descent parsing, semantic analysis, intermediate representation (IR) lowering, and Deterministic Finite Automata (DFA) state machines—to modern software architecture.

FlowScript allows users to define declarative automation pipelines using a clean, human-readable DSL. The backend compiler parses, validates, and compiles source code into intermediate bytecode instructions, while a rigorous DFA runtime enforces deterministic lifecycle transitions. The frontend provides a modern IDE with Monaco Editor, interactive workflow graph visualization, execution logs, and live state tracking.

- 📖 **[Comprehensive Final Project Report](./PROJECT_REPORT.md)**
- 🎓 **[Viva Voce & Oral Defense Guide](./VIVA_GUIDE.md)**

---

## 🏗️ System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FlowScript Web Studio                           │
│     (React 19 + TypeScript + Vite + Tailwind CSS + Monaco Editor)      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / JSON
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        FastAPI Backend Server                          │
│                                                                        │
│  ┌─────────────────────── COMPILER PIPELINE ────────────────────────┐  │
│  │                                                                  │  │
│  │   Source Code ──► Lexer (Token Stream)                          │  │
│  │                       │                                          │  │
│  │                       ▼                                          │  │
│  │                   Parser (Abstract Syntax Tree)                  │  │
│  │                       │                                          │  │
│  │                       ▼                                          │  │
│  │                   Semantic Analyzer (Symbol / Constraint Check)  │  │
│  │                       │                                          │  │
│  │                       ▼                                          │  │
│  │                   IR Generator (Instruction Sequence)            │  │
│  └───────────────────────┬──────────────────────────────────────────┘  │
│                          │                                             │
│                          ▼                                             │
│  ┌─────────────────────── DFA RUNTIME ENGINE ───────────────────────┐  │
│  │                                                                  │  │
│  │      State Machine: IDLE ──► RUNNING ──► SUCCESS ──► DONE        │  │
│  │                                 │                                │  │
│  │                                 ├──► RETRYING ──► RUNNING        │  │
│  │                                 │                                │  │
│  │                                 └──► FAILED                      │  │
│  │                                                                  │  │
│  │      Execution: Sequential & Conditional Instruction Dispatch   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🧮 Theoretical Automata & Formal Grammar

### 1. Formal Grammar (EBNF)

The FlowScript language is defined by the following context-free grammar:

```ebnf
Workflow      ::= "WORKFLOW" Identifier NEWLINE Statements "END" EOF
Statements    ::= Statement*
Statement     ::= TaskStmt | IfStmt | NEWLINE
TaskStmt      ::= "TASK" Identifier NEWLINE
IfStmt        ::= "IF" Condition NEWLINE Statements ("ELSE" NEWLINE Statements)? "END" NEWLINE
Condition     ::= Identifier (CompOp (Number | Identifier))?
CompOp        ::= ">=" | "<=" | "==" | "!=" | ">" | "<"
Number        ::= [0-9]+ ("." [0-9]+)?
Identifier    ::= [a-zA-Z_][a-zA-Z0-9_]*
Comment       ::= "#" [^\r\n]*
```

- **Lexical Class**: Regular Language recognized by regular expressions (`WORKFLOW`, `TASK`, `IF`, `ELSE`, `END`, Identifiers, Numbers, Operators, Newlines, Comments `#...`).
- **Syntactic Class**: Context-Free Language parsed using a single-token lookahead Recursive Descent Parser (`LL(1)` equivalent).

### 2. Deterministic Finite Automaton (DFA) Specification

Workflow execution is governed by a formal 5-tuple DFA:

$$M = (Q, \Sigma, \delta, q_0, F)$$

- **States ($Q$)**:
  - `IDLE`: Initial state before execution starts.
  - `RUNNING`: Engine is actively executing workflow instructions.
  - `SUCCESS`: All workflow instructions completed successfully.
  - `RETRYING`: A retryable failure occurred; awaiting retry step.
  - `FAILED`: An unrecoverable task failure occurred (terminal sink state).
  - `DONE`: Workflow execution is finalized (terminal accepting state).

- **Alphabet ($\Sigma$)**:
  - $\Sigma = \{\text{START}, \text{WORKFLOW\_SUCCESS}, \text{TASK\_FAILURE\_RETRYABLE}, \text{TASK\_FAILURE\_FINAL}, \text{RETRY}, \text{FINALIZE}, \text{RESET}\}$

- **Initial State ($q_0$)**: `IDLE`

- **Accepting States ($F$)**:
  - $F = \{\text{DONE}, \text{FAILED}\}$

### 3. DFA Transition Function ($\delta: Q \times \Sigma \to Q$)

| Current State ($q$) | Input Symbol ($\sigma$) | Next State ($\delta(q, \sigma)$) | Description |
|---------------------|-------------------------|-----------------------------------|-------------|
| `IDLE` | `START` | `RUNNING` | Begin workflow execution |
| `RUNNING` | `WORKFLOW_SUCCESS` | `SUCCESS` | All tasks finished without error |
| `RUNNING` | `TASK_FAILURE_RETRYABLE` | `RETRYING` | Recoverable error encountered |
| `RUNNING` | `TASK_FAILURE_FINAL` | `FAILED` | Unrecoverable error encountered |
| `RETRYING` | `RETRY` | `RUNNING` | Restarting from retry state |
| `SUCCESS` | `FINALIZE` | `DONE` | Teardown and seal workflow results |
| `FAILED` | `RESET` | `IDLE` | Reset engine back to initial state |
| `DONE` | `RESET` | `IDLE` | Reset engine back to initial state |

*Any unspecified transition $(q, \sigma)$ raises `InvalidTransitionError`, preventing illegal execution paths.*

---

## 💻 Implemented vs. Simulated Functionality

| Component | Status | Implementation Details |
|-----------|--------|------------------------|
| **Lexer** | **Fully Implemented** | Custom regex tokenizer with line/column tracking, keyword matching, floats/numbers, and operators (`backend/app/compiler/lexer.py`). |
| **Parser** | **Fully Implemented** | Top-down recursive-descent parser producing typed dataclass ASTs (`WorkflowNode`, `TaskNode`, `IfNode`) with block termination checks and comparison parsing (`backend/app/compiler/parser.py`). |
| **Semantic Analysis** | **Fully Implemented** | Symbol validation, identifier checking, supported task/variable/condition verification, and detailed error reporting with line numbers (`backend/app/compiler/semantic.py`). |
| **IR Lowering** | **Fully Implemented** | AST-to-IR compiler that converts hierarchical ASTs into serialized instruction sequences (`backend/app/compiler/ir.py`). |
| **DFA State Machine** | **Fully Implemented** | Strict tabular transition enforcement with state history recording and illegal transition rejection (`backend/app/runtime/dfa.py`). |
| **Execution Guard** | **Fully Implemented** | The engine strictly rejects compilation errors. If lexing, parsing, or semantic analysis fails, task execution **never** runs. |
| **REST API** | **Fully Implemented** | FastAPI endpoints for `/api/compile/lex`, `/api/compile/parse`, `/api/compile/build`, and `/api/compile/execute` (`backend/app/compiler/routes.py`). |
| **Web Studio UI** | **Fully Implemented** | Monaco Editor integration, React Flow visual workflow designer, DFA explorer with step-by-step replay, execution logs, and live state tracking (`frontend/src/App.tsx`). |
| **Task Actions** | **Simulated** | Tasks (`Search`, `Analyze`, `Summarize`, `Publish`, `Retry`) return deterministic simulated results for educational prototyping without external cloud service dependencies (`backend/app/runtime/engine.py`). |

---

## 📝 FlowScript DSL Syntax Reference

### 1. Sequential Workflow
```flowscript
WORKFLOW ResearchPipeline
TASK Search
TASK Analyze
TASK Summarize
END
```

### 2. Conditional Workflow with Comparison Expression
```flowscript
WORKFLOW ContentModeration
TASK Search
IF confidence > 0.8
    TASK Publish
ELSE
    TASK Retry
END
END
```

### 3. Nested Conditional Workflow
```flowscript
WORKFLOW NestedDecision
TASK Search
IF confidence > 0.8
    TASK Analyze
    IF score >= 90
        TASK Publish
    ELSE
        TASK Summarize
    END
ELSE
    TASK Retry
END
END
```

### Supported Vocabulary
- **Keywords**: `WORKFLOW`, `TASK`, `IF`, `ELSE`, `END`
- **Supported Tasks**: `Search`, `Analyze`, `Summarize`, `Publish`, `Retry`
- **Supported Condition Variables**: `confidence`, `score`, `accuracy`, `threshold`, `status`
- **Comparison Operators**: `>=`, `<=`, `==`, `!=`, `>`, `<`

---

## 🚀 Setup & Installation Guide

### Prerequisites
- **Python**: Version 3.11 or higher
- **Node.js**: Version 18 or higher (with npm)
- **PowerShell** (Windows) or Bash

### 1. Backend Setup

```powershell
# Navigate to the project root
cd C:\AT_CP\FlowScriptStudio

# Activate virtual environment
.\.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r backend/requirements.txt

# Start FastAPI server
uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
```
API Documentation will be live at: **`http://127.0.0.1:8000/docs`**

### 2. Frontend Setup

```powershell
# In a new terminal, navigate to frontend
cd C:\AT_CP\FlowScriptStudio\frontend

# Install dependencies
npm install

# Start development server
npm run dev
```
FlowScript Web Studio will be live at: **`http://localhost:5173`**

---

## 🧪 Testing & Verification

### 1. Backend Pytest Suite (Unit + Integration)

```powershell
.\.venv\Scripts\python.exe -m pytest backend\tests -v
```

**Results: 37 passed out of 37 tests (100% passing in ~0.37s)**
- `test_dfa.py` (5 tests): DFA transitions, retry loops, invalid transitions, and reset logic.
- `test_engine.py` (7 tests): Sequential execution, true-branch, false-branch, comparison expressions, context overriding.
- `test_lexer.py` (5 tests): Keywords, case insensitivity, comments, invalid character detection, comparison/number tokens.
- `test_parser.py` (5 tests): Simple workflows, if-else structures, missing END, unexpected tokens, comparison operators.
- `test_semantic.py` (5 tests): Valid workflows, unknown tasks, unknown conditions, comparison conditions, unknown variables.
- `test_integration.py` (10 tests): End-to-end FastAPI endpoint validation, error schemas, execution guard, and sample workflow.

### 2. Frontend TypeScript Build

```powershell
cd frontend
npm run build
```
**Results: 0 errors (clean compilation).**

---

## 👥 Authors & Academic Credits

- **Course**: Automata Theory & Formal Languages / Compiler Design (CSE Course Project)
- **Project**: FlowScript Studio — Domain-Specific Language Compiler & DFA Runtime
- **Technology Stack**: Python 3.11, FastAPI, React 19, TypeScript, Monaco Editor, React Flow
