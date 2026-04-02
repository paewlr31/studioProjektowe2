#!/usr/bin/env python3
"""
Startup script for LLM Society Simulator backend.
Run from the backend/ directory.
"""
import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "api.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
