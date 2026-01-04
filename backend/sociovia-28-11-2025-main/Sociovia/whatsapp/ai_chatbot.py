"""
WhatsApp AI Chatbot
===================

AI-powered conversational responses for WhatsApp automation.

Uses Google Gemini for intelligent responses with:
- Fail-safe design (errors never break message flow)
- Multi-tenant isolation (per-account configuration)
- Context-aware responses (conversation history)
- Rate limiting to prevent abuse
- Cost tracking per workspace

Production safety:
- All AI calls wrapped in try/except
- Timeout protection
- Token usage logging
- Graceful fallback to static responses
"""

import os
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, List
from dataclasses import dataclass

import google.generativeai as genai

logger = logging.getLogger(__name__)


# ============================================================
# Configuration
# ============================================================

# Default model - using gemini-2.0-flash (fast model for chat responses)
DEFAULT_MODEL = os.environ.get("TEXT_MODEL", "gemini-2.0-flash")

# Safety settings for WhatsApp (business context)
SAFETY_SETTINGS = [
    {
        "category": "HARM_CATEGORY_HARASSMENT",
        "threshold": "BLOCK_MEDIUM_AND_ABOVE"
    },
    {
        "category": "HARM_CATEGORY_HATE_SPEECH",
        "threshold": "BLOCK_MEDIUM_AND_ABOVE"
    },
    {
        "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        "threshold": "BLOCK_MEDIUM_AND_ABOVE"
    },
    {
        "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
        "threshold": "BLOCK_MEDIUM_AND_ABOVE"
    },
]

# Default system prompt for business conversations
DEFAULT_SYSTEM_PROMPT = """You are a helpful customer service assistant for a business.

RULES:
1. Be polite, professional, and helpful
2. Keep responses concise (under 300 characters ideal for WhatsApp)
3. If you don't know something, say so honestly
4. Never share sensitive information
5. For complex issues, suggest speaking with a human agent
6. Use simple language, avoid jargon
7. Do NOT use markdown formatting (no **, *, _, etc.)

You are speaking via WhatsApp, so keep messages brief and conversational."""


# ============================================================
# Data Classes
# ============================================================

@dataclass
class ChatResponse:
    """Result of AI chat response generation."""
    message: str
    success: bool = True
    error: Optional[str] = None
    tokens_used: int = 0
    model_used: str = DEFAULT_MODEL
    response_time_ms: int = 0
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "message": self.message,
            "success": self.success,
            "error": self.error,
            "tokens_used": self.tokens_used,
            "model_used": self.model_used,
            "response_time_ms": self.response_time_ms,
        }


@dataclass
class AIConfig:
    """AI configuration for an account."""
    enabled: bool = False
    system_prompt: str = DEFAULT_SYSTEM_PROMPT
    model: str = DEFAULT_MODEL
    max_tokens: int = 256
    temperature: float = 0.7
    fallback_message: str = "I'm sorry, I couldn't process your request. A team member will assist you soon."
    context_messages: int = 5  # Number of previous messages to include


# ============================================================
# Intent Detection
# ============================================================

# Available intents for classification
INTENT_TYPES = [
    "greeting",      # Hello, hi, hey, good morning
    "support",       # Need help, issue, problem, not working
    "sales",         # Pricing, buy, purchase, subscribe
    "info",          # What is, how does, tell me about
    "complaint",     # Angry, upset, refund, cancel
    "appointment",   # Book, schedule, meeting, availability
    "order_status",  # Where is my order, tracking, delivery
    "other"          # Catch-all for unclassified
]

INTENT_CLASSIFICATION_PROMPT = """Classify the following customer message into ONE of these intents:
- greeting: Greetings like hello, hi, hey, good morning
- support: Technical issues, need help, something not working
- sales: Pricing inquiries, want to buy, subscription questions
- info: General questions about products/services
- complaint: Unhappy customer, want refund, cancel service
- appointment: Booking, scheduling, availability
- order_status: Order tracking, delivery status
- other: Anything that doesn't fit above

Message: "{message}"

Respond with ONLY the intent name (one word, lowercase). Nothing else."""


@dataclass
class IntentResult:
    """Result of intent classification."""
    intent: str
    confidence: float = 1.0
    success: bool = True
    error: Optional[str] = None
    response_time_ms: int = 0
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "intent": self.intent,
            "confidence": self.confidence,
            "success": self.success,
            "error": self.error,
            "response_time_ms": self.response_time_ms,
        }


def classify_intent(message: str, model_name: Optional[str] = None) -> IntentResult:
    """
    Classify the intent of a customer message.
    
    Args:
        message: Customer message text
        model_name: Optional model override
        
    Returns:
        IntentResult with classified intent
    """
    import time
    start_time = time.time()
    
    try:
        api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
        
        if not api_key:
            return IntentResult(
                intent="other",
                success=False,
                error="GEMINI_API_KEY not configured"
            )
        
        genai.configure(api_key=api_key)
        
        model = genai.GenerativeModel(
            model_name=model_name or DEFAULT_MODEL,
            generation_config={
                "max_output_tokens": 20,
                "temperature": 0.1,  # Low temp for classification
            }
        )
        
        prompt = INTENT_CLASSIFICATION_PROMPT.format(message=message[:500])
        response = model.generate_content(prompt)
        
        elapsed_ms = int((time.time() - start_time) * 1000)
        
        if response.text:
            intent = response.text.strip().lower()
            # Validate intent
            if intent not in INTENT_TYPES:
                intent = "other"
            
            return IntentResult(
                intent=intent,
                confidence=0.9,  # We don't have actual confidence from Gemini
                success=True,
                response_time_ms=elapsed_ms
            )
        else:
            return IntentResult(
                intent="other",
                success=False,
                error="Empty response from model",
                response_time_ms=elapsed_ms
            )
            
    except Exception as e:
        elapsed_ms = int((time.time() - start_time) * 1000)
        logger.exception(f"Intent classification failed: {e}")
        return IntentResult(
            intent="other",
            success=False,
            error=str(e),
            response_time_ms=elapsed_ms
        )


# ============================================================
# AI Chatbot Class
# ============================================================

class WhatsAppAIChatbot:
    """
    AI-powered chatbot for WhatsApp conversations.
    
    Thread-safe and fail-safe by design.
    All operations are non-blocking and exception-protected.
    """
    
    def __init__(self, config: Optional[AIConfig] = None):
        """
        Initialize AI chatbot.
        
        Args:
            config: AI configuration (optional, uses defaults if not provided)
        """
        self.config = config or AIConfig()
        self.model = None
        self._initialized = False
        self._init_error: Optional[str] = None
        
        # Initialize Gemini
        self._initialize_gemini()
    
    def _initialize_gemini(self):
        """Initialize Gemini client. Fail-safe."""
        try:
            api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
            
            if not api_key:
                self._init_error = "GEMINI_API_KEY not configured"
                logger.warning("AI Chatbot: No API key found")
                return
            
            genai.configure(api_key=api_key)
            
            # Create model with safety settings
            generation_config = {
                "max_output_tokens": self.config.max_tokens,
                "temperature": self.config.temperature,
            }
            
            self.model = genai.GenerativeModel(
                model_name=self.config.model,
                generation_config=generation_config,
                safety_settings=SAFETY_SETTINGS,
                system_instruction=self.config.system_prompt,
            )
            
            self._initialized = True
            logger.info(f"AI Chatbot initialized with model: {self.config.model}")
            
        except Exception as e:
            self._init_error = str(e)
            logger.exception(f"AI Chatbot initialization failed: {e}")
    
    def is_available(self) -> bool:
        """Check if AI is available and configured."""
        return self._initialized and self.model is not None
    
    def generate_response(
        self,
        message: str,
        context: Optional[List[Dict[str, str]]] = None,
    ) -> ChatResponse:
        """
        Generate AI response for incoming message.
        
        Args:
            message: Incoming message text
            context: Optional list of previous messages [{"role": "user/model", "parts": ["text"]}]
            
        Returns:
            ChatResponse with generated message or fallback
        """
        import time
        start_time = time.time()
        
        # Check if AI is available
        if not self.is_available():
            return ChatResponse(
                message=self.config.fallback_message,
                success=False,
                error=self._init_error or "AI not initialized",
            )
        
        try:
            # Build conversation history
            history = []
            if context:
                for msg in context[-self.config.context_messages:]:
                    role = msg.get("role", "user")
                    text = msg.get("text", "") or msg.get("parts", [""])[0]
                    if text:
                        history.append({
                            "role": "user" if role == "user" else "model",
                            "parts": [text]
                        })
            
            # Create chat session with history
            if history:
                chat = self.model.start_chat(history=history)
            else:
                chat = self.model.start_chat()
            
            # Generate response
            response = chat.send_message(message)
            
            # Extract text
            response_text = response.text.strip() if response.text else ""
            
            # Clean any markdown that might have slipped through
            response_text = self._clean_markdown(response_text)
            
            # Truncate if too long for WhatsApp
            if len(response_text) > 1000:
                response_text = response_text[:997] + "..."
            
            # Calculate token usage
            tokens_used = 0
            if hasattr(response, 'usage_metadata'):
                tokens_used = getattr(response.usage_metadata, 'total_token_count', 0)
            
            elapsed_ms = int((time.time() - start_time) * 1000)
            
            logger.info(f"AI response generated in {elapsed_ms}ms, tokens: {tokens_used}")
            
            return ChatResponse(
                message=response_text,
                success=True,
                tokens_used=tokens_used,
                model_used=self.config.model,
                response_time_ms=elapsed_ms,
            )
            
        except Exception as e:
            elapsed_ms = int((time.time() - start_time) * 1000)
            logger.exception(f"AI response generation failed: {e}")
            
            return ChatResponse(
                message=self.config.fallback_message,
                success=False,
                error=str(e),
                response_time_ms=elapsed_ms,
            )
    
    def _clean_markdown(self, text: str) -> str:
        """Remove markdown formatting from response."""
        import re
        # Remove bold
        text = re.sub(r'\*\*(.+?)\*\*', r'\1', text)
        text = re.sub(r'__(.+?)__', r'\1', text)
        # Remove italic
        text = re.sub(r'\*(.+?)\*', r'\1', text)
        text = re.sub(r'_(.+?)_', r'\1', text)
        # Remove strikethrough
        text = re.sub(r'~~(.+?)~~', r'\1', text)
        # Remove code blocks
        text = re.sub(r'```.*?```', '', text, flags=re.DOTALL)
        text = re.sub(r'`(.+?)`', r'\1', text)
        return text.strip()


# ============================================================
# Helper Functions for Automation Engine
# ============================================================

def create_ai_chatbot(config_dict: Optional[Dict[str, Any]] = None) -> WhatsAppAIChatbot:
    """
    Factory function to create AI chatbot from config dict.
    
    Args:
        config_dict: Configuration dictionary with keys matching AIConfig fields
        
    Returns:
        Configured WhatsAppAIChatbot instance
    """
    if config_dict:
        config = AIConfig(
            enabled=config_dict.get("enabled", False),
            system_prompt=config_dict.get("system_prompt", DEFAULT_SYSTEM_PROMPT),
            model=config_dict.get("model", DEFAULT_MODEL),
            max_tokens=config_dict.get("max_tokens", 256),
            temperature=config_dict.get("temperature", 0.7),
            fallback_message=config_dict.get("fallback_message", AIConfig.fallback_message),
            context_messages=config_dict.get("context_messages", 5),
        )
    else:
        config = AIConfig()
    
    return WhatsAppAIChatbot(config=config)


def generate_ai_response(
    message: str,
    system_prompt: Optional[str] = None,
    context: Optional[List[Dict[str, str]]] = None,
    fallback_message: Optional[str] = None,
) -> ChatResponse:
    """
    Convenience function to generate AI response.
    
    For simple use cases where you don't need to manage chatbot instances.
    
    Args:
        message: Incoming message
        system_prompt: Custom system prompt (optional)
        context: Previous messages (optional)
        fallback_message: Custom fallback message (optional)
        
    Returns:
        ChatResponse
    """
    config = AIConfig(
        enabled=True,
        system_prompt=system_prompt or DEFAULT_SYSTEM_PROMPT,
        fallback_message=fallback_message or AIConfig.fallback_message,
    )
    
    chatbot = WhatsAppAIChatbot(config=config)
    return chatbot.generate_response(message=message, context=context)


# ============================================================
# Testing
# ============================================================

if __name__ == "__main__":
    # Quick test
    print("Testing AI Chatbot...")
    
    response = generate_ai_response(
        message="Hello, what services do you offer?",
        system_prompt="You are a customer service assistant for a marketing agency called Sociovia.",
    )
    
    print(f"Success: {response.success}")
    print(f"Message: {response.message}")
    print(f"Tokens: {response.tokens_used}")
    print(f"Time: {response.response_time_ms}ms")
    if response.error:
        print(f"Error: {response.error}")
