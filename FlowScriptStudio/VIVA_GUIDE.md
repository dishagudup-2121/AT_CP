# FlowScript Studio — Viva Voce & Oral Defense Guide

**Course**: Automata Theory & Formal Languages / Compiler Design (CSE)  
**Project**: FlowScript Studio (DSL Compiler & DFA Workflow Engine)  
**Status**: 37/37 Automated Pytest Tests Passed | Frontend Clean Production Build

---

## 1. Quick Technical Summary

- **Problem**: Traditional workflow orchestrators either rely on bloated visual interfaces or lack formal mathematical state-safety guarantees.
- **Solution**: FlowScript Studio introduces a lightweight domain-specific language with a 4-stage compiler (`Lexer` $\to$ `Parser` $\to$ `Semantic Analyzer` $\to$ `IR Lowering`) coupled with a formal Deterministic Finite Automaton (`DFA`) runtime.
- **Key Automata Linkages**:
  - **Regular Languages (Type-3)**: Lexical tokenization via regular expressions and the 6-state execution DFA.
  - **Context-Free Languages (Type-2)**: Balanced block nesting (`WORKFLOW...END`, `IF...ELSE...END`) parsed via a single-token lookahead recursive descent parser ($LL(1)$ equivalent).
  - **Deterministic Finite Automaton**: Lifecycle transition enforcement ($M = (Q, \Sigma, \delta, q_0, F)$) with strict transition tables.

---

## 2. Core Viva Voce Questions & High-Scoring Answers

### Q1: What is the formal mathematical 5-tuple definition of your execution DFA?
**Answer**:
The DFA is defined as $M = (Q, \Sigma, \delta, q_0, F)$:
- **$Q$ (Finite set of states)**: 
  $$\{\text{IDLE}, \text{RUNNING}, \text{SUCCESS}, \text{RETRYING}, \text{FAILED}, \text{DONE}\}$$
- **$\Sigma$ (Input alphabet / runtime event symbols)**:
  $$\{\text{START}, \text{WORKFLOW\_SUCCESS}, \text{TASK\_FAILURE\_RETRYABLE}, \text{TASK\_FAILURE\_FINAL}, \text{RETRY}, \text{FINALIZE}, \text{RESET}\}$$
- **$q_0$ (Start state)**: $\text{IDLE} \in Q$
- **$F$ (Accepting / terminal states)**: $\{\text{DONE}, \text{FAILED}\} \subseteq Q$
- **$\delta$ (Transition function $\delta: Q \times \Sigma \to Q$)**:
  - $\delta(\text{IDLE}, \text{START}) = \text{RUNNING}$
  - $\delta(\text{RUNNING}, \text{WORKFLOW\_SUCCESS}) = \text{SUCCESS}$
  - $\delta(\text{RUNNING}, \text{TASK\_FAILURE\_RETRYABLE}) = \text{RETRYING}$
  - $\delta(\text{RUNNING}, \text{TASK\_FAILURE\_FINAL}) = \text{FAILED}$
  - $\delta(\text{RETRYING}, \text{RETRY}) = \text{RUNNING}$
  - $\delta(\text{SUCCESS}, \text{FINALIZE}) = \text{DONE}$
  - $\delta(\text{FAILED}, \text{RESET}) = \text{IDLE}$
  - $\delta(\text{DONE}, \text{RESET}) = \text{IDLE}$

Any transition not defined in $\delta$ raises an `InvalidTransitionError`, guaranteeing that illegal state jumps (such as going directly from `IDLE` to `DONE`) are mathematically impossible.

---

### Q2: Why did you use a DFA rather than an NFA for runtime execution?
**Answer**:
A workflow execution lifecycle requires strictly deterministic, unambiguous behavior. An NFA allows non-deterministic branching or simultaneous states ($\delta(q, \sigma) \subseteq \mathcal{P}(Q)$), which in a distributed software system would lead to race conditions, indeterminate logging, and undefined recovery points. A DFA guarantees that for any current state and runtime event, there is exactly one next state ($|\delta(q, \sigma)| = 1$).

---

### Q3: Why is the FlowScript grammar classified as Context-Free (Type-2) rather than Regular (Type-3)?
**Answer**:
Regular languages can only be recognized by Finite Automata, which have a finite number of states and no auxiliary memory. Our language contains nested block structures (`IF ... ELSE ... END` nested within other `IF` constructs and enclosed in `WORKFLOW ... END`). 

To verify that every opening statement has a matching `END`, the language requires counting and tracking nesting depth ($L = \{ \text{IF}^n \dots \text{END}^n \mid n \ge 1 \}$), which is non-regular by the Pumping Lemma for Regular Languages. This requires a stack memory, implemented in our compiler via the call stack of a **Recursive Descent Parser**, which is equivalent to a **Deterministic Pushdown Automaton (DPDA)**.

---

### Q4: What parsing technique does your compiler use? Is it LL(1) or LR(1)?
**Answer**:
It is an **LL(1) Recursive Descent Parser** (Top-Down with 1-token lookahead):
- **L**: Scans tokens from Left to right.
- **L**: Produces a Leftmost derivation.
- **(1)**: Requires only 1 token of lookahead to determine the next production rule.
Because every statement in our grammar begins with an unambiguous keyword (`TASK`, `IF`, `ELSE`, `END`), the FIRST sets for each branch are mutually disjoint, meaning no backtracking is ever needed.

---

### Q5: How does your Lexer handle multi-character operators like `>=` versus `>`?
**Answer**:
The Lexer uses the **Maximal Munch (Longest Match)** principle implemented via prioritized regular expression groups:
```python
TOKEN_PATTERN = re.compile(
    r"(?P<GTE>>=)|(?P<LTE><=)|(?P<EQ>==)|(?P<NEQ>!=)"
    r"|(?P<GT>>)|(?P<LT><)"
    r"|(?P<NUMBER>[0-9]+(?:\.[0-9]+)?)"
    r"|(?P<IDENTIFIER>[A-Za-z_][A-Za-z0-9_]*)"
    r"|(?P<INVALID>.)"
)
```
Multi-character operators (`>=`, `<=`, `==`, `!=`) are checked before single-character operators (`>`, `<`), preventing premature tokenization of `>=` as `>` followed by `=`.

---

### Q6: How does the compiler handle comparison expressions in `IF` statements?
**Answer**:
In `parser.py`, `parse_condition()` consumes the left identifier, checks if the lookahead token is a comparison operator in `{GT, LT, GTE, LTE, EQ, NEQ}`, consumes the operator, and validates that the right-hand operand is a number or identifier. It constructs an atomic expression string (e.g. `"confidence > 0.8"`), which is stored in the `IfNode`.

In `semantic.py`, the analyzer validates that the variable belongs to `SUPPORTED_VARIABLES = {"confidence", "score", "accuracy", "threshold", "status"}` or `SUPPORTED_CONDITIONS = {"Success"}`.

In `engine.py`, `_evaluate_condition()` dynamically compares the runtime/simulation value of the variable with the target value using Python comparison semantics, branching execution accordingly.

---

### Q7: Why is Semantic Analysis a distinct phase from Syntax Parsing?
**Answer**:
Syntax parsing only checks grammatical structure—e.g., that `TASK` is followed by an identifier. The parser cannot know if that identifier represents a valid, registered task. 
The **Semantic Analyzer**:
1. Enforces domain constraints (`Search`, `Analyze`, `Summarize`, `Publish`, `Retry`).
2. Validates condition variables against registered metrics.
3. Checks identifier validity.
4. Reports structured semantic errors with line numbers before intermediate code generation.

---

### Q8: What is Intermediate Representation (IR) and why is it beneficial?
**Answer**:
Intermediate Representation lowers high-level AST syntax trees into machine-independent instruction lists:
```json
{
  "op": "IF",
  "condition": "confidence > 0.8",
  "then": [{"op": "TASK", "name": "Publish", "line": 4}],
  "else": [{"op": "TASK", "name": "Retry", "line": 6}]
}
```
**Benefits**:
- Decouples the compiler frontend from the runtime backend.
- Enables compiler optimizations (dead code elimination, constant folding).
- Allows new frontends (e.g., a visual block editor) to target the exact same runtime engine without rewriting execution code.

---

### Q9: How does the system guarantee compile-time execution safety?
**Answer**:
Through an **Execution Guard** in `/api/compile/execute`:
1. The server calls `build_workflow()`, running Lexing, Parsing, and Semantic Analysis.
2. If any stage reports an error, execution immediately terminates and returns `success: False` with error diagnostics.
3. The `WorkflowEngine` is **never instantiated or invoked** on invalid code.

---

### Q10: What is implemented versus simulated?
**Answer**:
- **Fully Implemented**:
  1. Lexer (regex tokenization, line/column tracking, float & operator support).
  2. Recursive-descent parser (LL(1) single-lookahead, AST dataclasses).
  3. Semantic analyzer (symbol checks, line-numbered diagnostics).
  4. IR lowering (AST $\to$ JSON instruction stream).
  5. 5-tuple DFA state machine (transition validation, history tracking).
  6. Conditional execution (branch evaluation, dynamic selection).
  7. Interactive Web IDE (Monaco Editor, React Flow visual editor, DFA step replay).
- **Simulated**:
  - The tasks themselves (`Search`, `Analyze`, `Summarize`, `Publish`, `Retry`) return deterministic simulated payloads (e.g. `"Search completed"`) rather than calling external paid cloud APIs, keeping the project 100% offline, reproducible, and verifiable.

---

## 3. Examiner Demonstration Script (Step-by-Step)

| Step | Action in UI | What to Say / Highlight |
|---|---|---|
| **1. Startup** | Open `http://localhost:5173` | *"Here is the FlowScript Studio. The editor features custom syntax highlighting and autocomplete. The runtime state indicator starts at IDLE."* |
| **2. TRUE Branch** | Click **Load Conditional**, then click **Run workflow** | *"Notice the code `IF confidence > 0.8`. With default simulated confidence=0.85, the condition evaluates to True. In the Results tab, only `Search` and `Publish` are executed; `Retry` is skipped."* |
| **3. Visual Graph** | Click **Visual workflow** tab | *"Here is the compiled workflow graph rendered via React Flow. `Search` and `Publish` have green SUCCESS borders, while `Retry` is unexecuted in PENDING. Notice the clean canvas with no minimap artifacts."* |
| **4. DFA Replay** | Click **DFA Explorer** tab, click **Play** | *"This visualizes our 6-state execution DFA. Clicking Play steps through the automaton: IDLE -> RUNNING -> SUCCESS -> DONE."* |
| **5. FALSE Branch** | Switch to Code editor, change `> 0.8` to `< 0.5`, click **Run workflow** | *"Now the condition evaluates to False. Look at the Results tab: `Search` and `Retry` are executed, and `Publish` is skipped."* |
| **6. Compile Guard** | Delete the `END` statement, click **Run workflow** | *"Demonstrating our execution guard: the compiler halts at the parser stage with a line number error. The engine is never invoked on invalid code."* |
| **7. Semantic Check** | Type `TASK UnknownTask`, click **Run workflow** | *"Syntax is valid, but the Semantic Analyzer rejects `UnknownTask` before runtime."* |
| **8. Automated Tests** | Run `pytest backend/tests` in terminal | *"Here is our automated test suite: 37 tests across lexer, parser, semantic analyzer, engine, DFA, and integration endpoints—all passing in under 0.4 seconds."* |
