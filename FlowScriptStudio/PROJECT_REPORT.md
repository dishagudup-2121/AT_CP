# FlowScript Studio: Formal Language Compiler & DFA Runtime Engine
## Course Project Final Technical Report
**Course**: Automata Theory & Compiler Design (CSE)  
**Academic Term**: 2026  
**Status**: Completed & Verified (37/37 Tests Passed, 0 Build Errors)

---

## 📑 Executive Summary & Abstract

**FlowScript Studio** is an integrated software system that bridges foundational theoretical computer science with modern engineering practices. Built specifically for the **Automata Theory & Formal Languages** curriculum, the project implements:
1. A Domain-Specific Language (**FlowScript**) designed for declarative workflow pipelines and conditional automation.
2. A formal **4-stage compiler pipeline** consisting of:
   - Regular expression-based **Lexical Analyzer** ($\Sigma$-tokenization).
   - Single-token lookahead **Recursive Descent Parser** (Context-Free Grammar recognition).
   - **Semantic Analyzer** enforcing symbol tables and domain constraints.
   - **Intermediate Representation (IR) Lowering** stage converting ASTs to bytecode-like instructions.
3. A formal **Deterministic Finite Automaton (DFA)** execution engine $M = (Q, \Sigma, \delta, q_0, F)$ governing the lifecycle of workflow execution with mathematical guarantees of deterministic state transitions.
4. An interactive **Web Studio IDE** featuring Monaco Editor syntax highlighting, live compiler diagnostics, interactive React Flow workflow editing, and step-by-step DFA state replay.

---

## 1. Theoretical Foundations & Automata Mapping

The architecture maps directly to the classical Chomsky Hierarchy and Automata Theory:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           THE CHOMSKY HIERARCHY                                 │
├──────────────────┬──────────────────────┬─────────────────┬─────────────────────┤
│ Language Class   │ Automaton / Machine  │ FlowScript Role │ Implementation      │
├──────────────────┼──────────────────────┼─────────────────┼─────────────────────┤
│ Type-3: Regular  │ Finite Automaton     │ Lexer & Tokens, │ Regex Tokenizer,    │
│                  │ (DFA / NFA)          │ Lifecycle State │ WorkflowDFA class   │
├──────────────────┼──────────────────────┼─────────────────┼─────────────────────┤
│ Type-2: Context- │ Pushdown Automaton   │ DSL Grammar &   │ Recursive Descent   │
│ Free (CFG)       │ (PDA with Stack)     │ Block Nesting   │ Parser (Call Stack) │
├──────────────────┼──────────────────────┼─────────────────┼─────────────────────┤
│ Type-1 / Type-0  │ Turing Machine / LBA │ General Runtime │ Python Host Engine  │
└──────────────────┴──────────────────────┴─────────────────┴─────────────────────┘
```

### 1.1 Lexical Class: Type-3 Regular Languages
Tokens in FlowScript—keywords (`WORKFLOW`, `TASK`, `IF`, `ELSE`, `END`), identifiers, comparison operators (`>=`, `<=`, `==`, `!=`, `>`, `<`), numbers, and comments—are regular expressions recognized by deterministic finite state machines without auxiliary memory.

### 1.2 Syntactic Class: Type-2 Context-Free Languages
FlowScript allows arbitrarily nested block structures (`IF ... ELSE ... END` inside other `IF` constructs, enclosed within `WORKFLOW ... END`). Recognizing balanced nested blocks requires memory of arbitrary depth, which cannot be modeled by finite automata ($a^n b^n \notin \text{Regular}$). A **Pushdown Automaton (PDA)** or a **Recursive Descent Parser** (using the execution call stack) is mathematically necessary.

### 1.3 Execution Class: Deterministic Finite Automaton (DFA)
The execution lifecycle of any workflow is strictly governed by a 5-tuple DFA:
$$M = (Q, \Sigma, \delta, q_0, F)$$

- **States ($Q$)**:
  $$Q = \{\text{IDLE}, \text{RUNNING}, \text{SUCCESS}, \text{RETRYING}, \text{FAILED}, \text{DONE}\}$$
  - $\text{IDLE}$: Initial rest state before compilation/execution.
  - $\text{RUNNING}$: Actively executing dispatched instructions.
  - $\text{SUCCESS}$: All instructions in the active path succeeded.
  - $\text{RETRYING}$: A recoverable fault occurred; transition back to RUNNING.
  - $\text{FAILED}$: Terminal failure state (dead end sink for fatal errors).
  - $\text{DONE}$: Terminal accepting state; results finalized.

- **Input Alphabet ($\Sigma$)**:
  $$\Sigma = \{\text{START}, \text{WORKFLOW\_SUCCESS}, \text{TASK\_FAILURE\_RETRYABLE}, \text{TASK\_FAILURE\_FINAL}, \text{RETRY}, \text{FINALIZE}, \text{RESET}\}$$

- **Initial State ($q_0$)**: $q_0 = \text{IDLE}$

- **Accepting / Final States ($F$)**: $F = \{\text{DONE}, \text{FAILED}\}$

- **Transition Function ($\delta: Q \times \Sigma \to Q$)**:

$$\begin{array}{|l|l|l|}
\hline
\textbf{Current State } (q) & \textbf{Event / Input } (\sigma) & \textbf{Next State } (\delta(q, \sigma)) \\
\hline
\text{IDLE} & \text{START} & \text{RUNNING} \\
\text{RUNNING} & \text{WORKFLOW\_SUCCESS} & \text{SUCCESS} \\
\text{RUNNING} & \text{TASK\_FAILURE\_RETRYABLE} & \text{RETRYING} \\
\text{RUNNING} & \text{TASK\_FAILURE\_FINAL} & \text{FAILED} \\
\text{RETRYING} & \text{RETRY} & \text{RUNNING} \\
\text{SUCCESS} & \text{FINALIZE} & \text{DONE} \\
\text{FAILED} & \text{RESET} & \text{IDLE} \\
\text{DONE} & \text{RESET} & \text{IDLE} \\
\hline
\end{array}$$

*Any unspecified transition $(q, \sigma) \notin \operatorname{dom}(\delta)$ is illegal and raises `InvalidTransitionError`, mathematically preventing invalid lifecycle states.*

---

## 2. Formal Grammar Specification (EBNF)

```ebnf
Workflow       ::= "WORKFLOW" Identifier NEWLINE Statements "END" EOF
Statements     ::= (Statement)*
Statement      ::= TaskStatement | IfStatement | NEWLINE
TaskStatement  ::= "TASK" Identifier NEWLINE
IfStatement    ::= "IF" Condition NEWLINE Statements ("ELSE" NEWLINE Statements)? "END" NEWLINE
Condition      ::= Identifier (ComparisonOp (Number | Identifier))?
ComparisonOp   ::= ">=" | "<=" | "==" | "!=" | ">" | "<"
Number         ::= [0-9]+ ("." [0-9]+)?
Identifier     ::= [a-zA-Z_][a-zA-Z0-9_]*
Comment        ::= "#" [^\r\n]*
```

### Grammar Attributes
- **Determinism**: The grammar is $LL(1)$. Every statement begins with a unique keyword token (`TASK`, `IF`, `ELSE`, `END`). The parser needs at most 1 token of lookahead without backtracking.
- **Operator Precedence**: Comparison expressions in conditions evaluate as binary atomic relations (`left op right`).

---

## 3. End-to-End Compiler Pipeline

```
  Source Code (.flow)
         │
         ▼
┌──────────────────┐   Token Stream
│  1. Lexer        │ ────────────────► [Token(WORKFLOW), Token(ID, "Demo"), Token(NEWLINE)...]
└──────────────────┘
         │
         ▼
┌──────────────────┐   Abstract Syntax Tree (AST)
│  2. Parser       │ ────────────────► WorkflowNode(name="Demo", body=[TaskNode, IfNode])
└──────────────────┘
         │
         ▼
┌──────────────────┐   Validated AST / Semantic Errors
│  3. Semantic     │ ────────────────► Checks SUPPORTED_TASKS, SUPPORTED_VARIABLES,
│     Analyzer     │                   and rejects undefined symbols.
└──────────────────┘
         │
         ▼
┌──────────────────┐   Intermediate Representation (IR)
│  4. IR Generator │ ────────────────► {"workflow": "Demo", "instructions": [{"op": "TASK"...}]}
└──────────────────┘
         │
         ▼
┌──────────────────┐   DFA Enforcement & Execution
│  5. DFA Runtime  │ ────────────────► State Machine: IDLE ──► RUNNING ──► SUCCESS ──► DONE
└──────────────────┘
```

### Stage 1: Lexical Analysis (`lexer.py`)
- Regex-based scanner with precise `line` and `column` tracking.
- Recognizes DSL keywords, identifiers, floating-point/integer numbers, multi-character comparison operators (`>=`, `<=`, `==`, `!=`), and comments.

### Stage 2: Recursive Descent Parser (`parser.py`)
- Constructs typed dataclass nodes: `WorkflowNode`, `TaskNode`, `IfNode`.
- Enforces strict block termination (`END` keywords for `IF` and `WORKFLOW`).
- Collects comparison expressions into clean condition strings.

### Stage 3: Semantic Analysis (`semantic.py`)
- Validates contextual constraints:
  - Workflow names must be valid identifiers.
  - Tasks must exist in `SUPPORTED_TASKS = {"Search", "Analyze", "Summarize", "Publish", "Retry"}`.
  - Condition variables must exist in `SUPPORTED_VARIABLES = {"confidence", "score", "accuracy", "threshold", "status"}` or `SUPPORTED_CONDITIONS = {"Success"}`.
- Emits structured `SemanticError` objects with exact line numbers.

### Stage 4: Intermediate Representation Lowering (`ir.py`)
- Lowers the hierarchical AST into serialized, machine-independent IR instructions:
  - `{"op": "TASK", "name": "Search", "line": 2}`
  - `{"op": "IF", "condition": "confidence > 0.8", "then": [...], "else": [...], "line": 3}`
- Decouples language syntax from the execution engine.

### Stage 5: DFA Runtime Engine (`engine.py` & `dfa.py`)
- Evaluates conditions dynamically against simulation context (default `confidence: 0.85`).
- Executes only the branches selected by runtime truth values.
- Emits timestamped execution logs and updates the DFA state.
- **Compile Guard Guarantee**: If any compile phase fails, execution never runs.

---

## 4. Verification & Automated Test Suite

FlowScript Studio is backed by a 37-test automated verification suite:

```
rootdir: C:\AT_CP\FlowScriptStudio\backend
collected 37 items

tests\test_dfa.py .....                                                  [ 13%]
tests\test_engine.py .......                                             [ 32%]
tests\test_integration.py ..........                                     [ 59%]
tests\test_lexer.py .....                                                [ 72%]
tests\test_parser.py .....                                               [ 86%]
tests\test_semantic.py .....                                             [100%]

============================= 37 passed in 0.37s ==============================
```

### Test Coverage Matrix

| Test Module | Tests | Verifications |
|---|---|---|
| `test_dfa.py` | 5 | State transitions, retry loop, illegal transitions, terminal states, reset. |
| `test_lexer.py` | 5 | Keywords, case insensitivity, comments, invalid character errors, comparison/number tokens. |
| `test_parser.py` | 5 | Sequential workflows, conditional parsing, missing END errors, unexpected tokens, comparison operators. |
| `test_semantic.py` | 5 | Valid workflows, unknown task rejection, unknown condition rejection, comparison condition acceptance, unknown variable rejection. |
| `test_engine.py` | 7 | Sequential dispatch, true-branch execution, false-branch execution, comparison evaluation, custom context overriding, error handling. |
| `test_integration.py` | 10 | FastAPI REST endpoints, JSON schemas, compilation error isolation, compile-time guard guarantees, and sample workflow execution. |

---

## 5. User Interface & Interactive Studio

The FlowScript Studio frontend is implemented using **React 19, TypeScript, Tailwind CSS, Monaco Editor, and React Flow**:

1. **Code Editor Tab**: Monaco Editor with Monarch lexical tokenizer, syntax highlighting, autocomplete snippets, and inline compiler diagnostic markers.
2. **Visual Workflow Designer Tab**: Dynamic directed graph rendered via React Flow, color-coded node execution badges (`SUCCESS` in emerald, `PENDING` in slate), branch labels (`TRUE` / `FALSE`), and a full Node Properties panel to edit task types and branches.
3. **DFA Explorer Tab**: Interactive visualization of the 6-state automaton with step-by-step execution replay controls (Play, Pause, Step Next, Step Prev, Reset) tracking recorded state history.
4. **Execution Monitor**: Real-time display of runtime state, completed task counter, structured execution logs, and output payloads.

---

## 6. Project Architecture Directory Structure

```
FlowScriptStudio/
├── backend/
│   ├── app/
│   │   ├── compiler/
│   │   │   ├── tokens.py        # Token definitions & TokenType enum
│   │   │   ├── lexer.py         # Regular expression tokenizer
│   │   │   ├── parser.py        # Recursive-descent AST parser
│   │   │   ├── ast_nodes.py     # Typed dataclass AST definitions
│   │   │   ├── semantic.py      # Symbol & constraint analyzer
│   │   │   ├── ir.py            # Intermediate representation lowering
│   │   │   └── routes.py        # FastAPI compiler & execution endpoints
│   │   ├── runtime/
│   │   │   ├── dfa.py           # 5-tuple DFA state machine & transition table
│   │   │   └── engine.py        # Execution engine & simulated dispatch
│   │   └── main.py              # Application entrypoint & CORS middleware
│   └── tests/                   # 37-test Pytest test suite
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── WorkflowGraph.tsx # React Flow visual designer
│   │   │   └── DFAExplorer.tsx   # DFA state machine & step replay
│   │   ├── editor/
│   │   │   ├── flowscript.ts     # Monaco Monarch grammar & autocomplete
│   │   │   └── formatFlowscript.ts # Source code formatter
│   │   ├── App.tsx              # Main studio workspace & state
│   │   └── index.css            # Design tokens & styling
│   └── package.json
├── README.md                    # Project documentation & quick start
├── VIVA_GUIDE.md                # Comprehensive viva questions & defense guide
└── PROJECT_REPORT.md            # Formal academic project technical report
```

---

## 7. Conclusion

FlowScript Studio demonstrates that classical Automata Theory and Compiler Design principles are not merely abstract academic concepts, but practical tools for building reliable, verifiable software systems. By enforcing formal language boundaries at compile time and deterministic state transitions at runtime, the system prevents illegal execution paths and provides predictable workflow orchestration.
