from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.compiler.routes import router as compiler_router

app = FastAPI(
    title="FlowScript Studio API",
    description="Compiler-based workflow language with Automata Theory validation.",
    version="1.0.0",
)

app.include_router(compiler_router)

# Allow the React development server to communicate with FastAPI.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "message": "Welcome to FlowScript Studio API",
        "status": "running",
    }


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "FlowScript Studio",
        "compiler": "not_initialized",
    }
