from fastapi import FastAPI, Body, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from langchain_groq import ChatGroq
from typing import Optional, List, Dict, Any
import uvicorn
import re
import os
import time
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI(
    title="Code Assistant API",
    description="AI-powered code assistance API using Groq models",
    version="1.0.0"
)

# Add CORS middleware to allow requests from your React app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Update with your React app's URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Get API key from environment variables
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "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")

# Available models
AVAILABLE_MODELS = {
    "llama-3.3-70b-versatile": "Llama 3.3 70B Versatile",
    "llama-3.1-8b-instant": "Llama 3.1 8B Instant",
    "mixtral-8x7b-32768": "Mixtral 8x7B 32K",
    "gemma-7b-it": "Gemma 7B IT"
}

class AiRequest(BaseModel):
    query: str = Field(..., description="The user's question or request")
    code: Optional[str] = Field(None, description="Code snippet to analyze")
    language: str = Field("javascript", description="Programming language of the code")
    filename: str = Field("untitled", description="Name of the file containing the code")
    model: str = Field("llama-3.3-70b-versatile", description="AI model to use")
    
    class Config:
        schema_extra = {
            "example": {
                "query": "How can I optimize this function?",
                "code": "function factorial(n) {\n  if (n === 0) return 1;\n  return n * factorial(n-1);\n}",
                "language": "javascript",
                "filename": "factorial.js",
                "model": "llama-3.3-70b-versatile"
            }
        }

class AiResponse(BaseModel):
    response: str
    code_blocks: List[Dict[str, str]] = []
    execution_time: float

# Rate limiting middleware
@app.middleware("http")
async def add_rate_limiting(request: Request, call_next):
    # Simple rate limiting - could be replaced with Redis for production
    if not hasattr(app, "request_timestamps"):
        app.request_timestamps = []
    
    # Clean old timestamps (older than 1 minute)
    current_time = time.time()
    app.request_timestamps = [ts for ts in app.request_timestamps if current_time - ts < 60]
    
    # Check if too many requests (more than 20 per minute)
    if len(app.request_timestamps) >= 20:
        return HTTPException(status_code=429, detail="Too many requests. Please try again later.")
    
    # Add current timestamp
    app.request_timestamps.append(current_time)
    
    # Process the request
    response = await call_next(request)
    return response

def validate_model(request: AiRequest):
    if request.model not in AVAILABLE_MODELS:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid model. Available models: {', '.join(AVAILABLE_MODELS.keys())}"
        )
    return request

@app.get("/api/models")
async def get_available_models():
    """Get list of available AI models"""
    return {"models": [{"id": k, "name": v} for k, v in AVAILABLE_MODELS.items()]}

@app.post("/api/ai", response_model=AiResponse)
async def process_ai_request(request: AiRequest = Depends(validate_model)):
    """Process an AI request to analyze code and provide assistance"""
    start_time = time.time()
    
    try:
        # Initialize model
        llm = ChatGroq(
            model_name=request.model,
            temperature=0.9,
            groq_api_key=GROQ_API_KEY
        )
        print(f"Using model: {request.model}")
        
        # Build the prompt
        prompt = f"As an AI code assistant, help with the following question about this {request.language} code:\n\n"
        
        if request.code:
            prompt += f"File: {request.filename}\n```{request.language}\n{request.code}\n```\n\n"
        
        prompt += f"Question: {request.query}\n\n"
        prompt += "Please provide a clear, concise response. If code improvements are suggested, provide the specific code that should be modified. If appropriate, include complete working examples."
        
        # Invoke model
        response = llm.invoke(prompt)
        
        # Extract content
        content = response.content.strip()
        
        # Extract all code blocks with their languages
        code_blocks = []
        code_block_pattern = r"```(.*?)\n([\s\S]*?)```"
        matches = re.findall(code_block_pattern, content)
        
        for lang, code in matches:
            # Clean the language identifier
            lang = lang.strip() or request.language
            code_blocks.append({"language": lang, "code": code.strip()})
        
        execution_time = time.time() - start_time
        
        return {
            "response": content,
            "code_blocks": code_blocks,
            "execution_time": round(execution_time, 2)
        }
    
    except Exception as e:
        execution_time = time.time() - start_time
        raise HTTPException(
            status_code=500, 
            detail={
                "error": str(e),
                "execution_time": round(execution_time, 2)
            }
        )

@app.get("/api/health")
async def health_check():
    """API health check endpoint"""
    return {"status": "healthy", "api_version": "1.0.0"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)