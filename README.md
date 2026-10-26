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

### Option A: One-Click Launch (Recommended for Windows)

1. **First-time Setup**: Double-click **`setup.bat`** (or run `.\setup.bat` in terminal).  
   *Automatically checks Python 3.11+ & Node.js 18+, creates virtual environment, and installs backend + frontend dependencies.*

2. **Run Application**: Double-click **`start.bat`** (or run `.\start.bat` in terminal).  
   *Launches FastAPI backend (:8000), Vite frontend (:5173), and opens `http://localhost:5173` in your browser automatically.*

3. **Run 37-Test Suite**: Double-click **`test.bat`** (or run `.\test.bat` in terminal).  
   *Executes all unit and integration pytest tests (100% passing).*

---

### Option B: Manual Terminal Setup

#### 1. Setup & Run Backend (FastAPI)
```bash
cd FlowScriptStudio
python -m venv .venv
# Windows:
.\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
# Linux / macOS:
# source .venv/bin/activate && pip install -r backend/requirements.txt
# uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
```

#### 2. Setup & Run Frontend (React 19 + Vite)
```bash
cd FlowScriptStudio/frontend
npm install
npm run dev
```
Open [http://localhost:5173/](http://localhost:5173/) in your browser.

#### 3. Run Verification Tests
```bash
cd FlowScriptStudio
.\.venv\Scripts\python.exe -m pytest backend/tests -v
```
*Output: 37 passed in ~0.45s (100% pass rate).*
