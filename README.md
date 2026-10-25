# Automata Theory & Compiler Design — Course Project (AT_CP)

> **FlowScript Studio** — A Domain-Specific Language (DSL) Compiler & Deterministic Finite Automaton (DFA) Runtime Engine

---

## 🚀 Quick Navigation

- 📁 **[FlowScript Studio Project Directory](./FlowScriptStudio/)**
- 📖 **[Comprehensive Academic Project Report](./FlowScriptStudio/PROJECT_REPORT.md)** (Chomsky Hierarchy, EBNF Grammar, Formal DFA 5-Tuple, Verification)
- 🎓 **[Viva Voce & Oral Defense Guide](./FlowScriptStudio/VIVA_GUIDE.md)** (Examiner Q&A, Demonstration Script)
- 💻 **[FlowScript Full Documentation](./FlowScriptStudio/README.md)**

---

## 📌 Executive Summary

**FlowScript Studio** is an educational, production-grade system bridging theoretical computer science with modern developer tooling. It implements:

1. **Custom Domain-Specific Language (DSL)**:
   - Declarative workflow definitions with sequential tasks, conditional branches (`IF condition THEN ... ELSE ...`), and binary comparison expressions (`>`, `<`, `>=`, `<=`, `==`, `!=`).
2. **End-to-End Compiler Pipeline**:
   - **Lexer**: Tokenizes source into classified lexemes with line/column tracking.
   - **Parser**: Handcrafted recursive descent parser enforcing a Context-Free Grammar (CFG) in Chomsky Normal Form / EBNF.
   - **Semantic Analyzer**: Symbol resolution, duplicate task detection, type checking, and cycle detection.
   - **Intermediate Representation (IR)**: Bytecode instructions (`TASK_EXEC`, `BRANCH_COND`, `JUMP`, `HALT`).
3. **Formal Automata Theory Integration**:
   - A 5-tuple Deterministic Finite Automaton $M = (Q, \Sigma, \delta, q_0, F)$ governing workflow lifecycle:
     - $Q = \{\text{IDLE}, \text{COMPILING}, \text{READY}, \text{RUNNING}, \text{SUCCESS}, \text{FAILED}\}$
     - Full transition table with 8 deterministic transitions, rejecting invalid sequences and ensuring no race conditions.
4. **Interactive Web Studio**:
   - Built with React 19, TypeScript, Vite, Tailwind CSS, Monaco Editor (with custom syntax highlighting and autocomplete), ReactFlow visual DAG with live execution glow, properties inspector, and step-by-step DFA state replay.

---

## 🛠️ Project Structure

```
AT_CP/
├── FlowScriptStudio/
│   ├── backend/               # FastAPI + Python 3.11 Compiler & Runtime
│   │   ├── app/
│   │   │   ├── compiler/      # Lexer, Parser, Semantic Analyzer, AST, IR
│   │   │   └── runtime/       # DFA State Machine, Bytecode Engine
│   │   └── tests/             # 37 Unit & Integration Pytest Suite
│   ├── frontend/              # React 19 + TypeScript + Vite Studio
│   │   └── src/
│   │       ├── components/    # Monaco Editor, WorkflowGraph, DFAExplorer, Logs
│   │       └── dsl/           # FlowScript Monaco Monarch Syntax Definition
│   ├── PROJECT_REPORT.md      # Formal Academic Paper
│   ├── VIVA_GUIDE.md          # Viva Preparation & Examiner Q&A Guide
│   └── README.md              # Detailed Documentation & Setup Instructions
└── README.md                  # Course Project Index
```

---

## ⚡ Quick Start

### 1. Run Backend Server
```bash
cd FlowScriptStudio/backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

### 2. Run Frontend Web Studio
```bash
cd FlowScriptStudio/frontend
npm install
npm run dev
```
Open [http://localhost:5173/](http://localhost:5173/) in your browser.

### 3. Run Verification Tests
```bash
cd FlowScriptStudio/backend
pytest
```
*Output: 37 passed in 0.44s (100% pass rate).*
