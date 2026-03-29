"""Anthropic Claude API client with retry, token tracking, and structured output."""

import json
import logging
import os
import time
from typing import Any, Dict, Optional

import anthropic
from pydantic import BaseModel

logger = logging.getLogger(__name__)

# Token usage tracking
_total_input_tokens = 0
_total_output_tokens = 0


class ClaudeResponse(BaseModel):
    """Wrapped response from Claude API."""

    content: str
    model: str
    input_tokens: int
    output_tokens: int
    stop_reason: Optional[str] = None


class ClaudeClient:
    """Wrapper around the Anthropic SDK with retry, token tracking, and structured output."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: str = "claude-sonnet-4-20250514",
        max_retries: int = 3,
        timeout: float = 60.0,
    ):
        self.api_key = api_key or os.getenv("ANTHROPIC_API_KEY", "")
        self.model = model
        self.max_retries = max_retries
        self.client = anthropic.Anthropic(
            api_key=self.api_key,
            timeout=timeout,
            max_retries=0,  # We handle retries ourselves
        )

    def complete(
        self,
        system: str,
        user_message: str,
        max_tokens: int = 4096,
        temperature: float = 0.3,
    ) -> ClaudeResponse:
        """Send a completion request to Claude with retry logic."""
        global _total_input_tokens, _total_output_tokens

        last_error: Optional[Exception] = None
        for attempt in range(1, self.max_retries + 1):
            try:
                response = self.client.messages.create(
                    model=self.model,
                    max_tokens=max_tokens,
                    temperature=temperature,
                    system=system,
                    messages=[{"role": "user", "content": user_message}],
                )

                result = ClaudeResponse(
                    content=response.content[0].text,
                    model=response.model,
                    input_tokens=response.usage.input_tokens,
                    output_tokens=response.usage.output_tokens,
                    stop_reason=response.stop_reason,
                )

                _total_input_tokens += result.input_tokens
                _total_output_tokens += result.output_tokens

                logger.info(
                    "Claude API call",
                    extra={
                        "model": result.model,
                        "input_tokens": result.input_tokens,
                        "output_tokens": result.output_tokens,
                        "attempt": attempt,
                    },
                )

                return result

            except anthropic.RateLimitError as e:
                last_error = e
                wait = min(2**attempt, 30)
                logger.warning(f"Rate limited, retrying in {wait}s (attempt {attempt}/{self.max_retries})")
                time.sleep(wait)

            except anthropic.APIStatusError as e:
                last_error = e
                if e.status_code >= 500:
                    wait = min(2**attempt, 30)
                    logger.warning(f"Server error {e.status_code}, retrying in {wait}s")
                    time.sleep(wait)
                else:
                    raise

            except anthropic.APIConnectionError as e:
                last_error = e
                wait = min(2**attempt, 30)
                logger.warning(f"Connection error, retrying in {wait}s")
                time.sleep(wait)

        raise RuntimeError(f"Claude API failed after {self.max_retries} retries: {last_error}")

    def complete_json(
        self,
        system: str,
        user_message: str,
        max_tokens: int = 4096,
        temperature: float = 0.2,
    ) -> Dict[str, Any]:
        """Send a request expecting a JSON response. Parses and returns the dict."""
        json_system = system + "\n\nYou MUST respond with valid JSON only. No markdown, no code fences, no explanation."
        response = self.complete(json_system, user_message, max_tokens, temperature)

        text = response.content.strip()
        # Strip markdown code fences if present
        if text.startswith("```"):
            lines = text.split("\n")
            text = "\n".join(lines[1:-1] if lines[-1].startswith("```") else lines[1:])

        try:
            parsed = json.loads(text)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON response: {e}\nRaw: {text[:500]}")
            raise ValueError(f"Claude returned invalid JSON: {e}") from e

        return parsed

    @staticmethod
    def get_usage() -> Dict[str, int]:
        """Return cumulative token usage."""
        return {
            "total_input_tokens": _total_input_tokens,
            "total_output_tokens": _total_output_tokens,
            "total_tokens": _total_input_tokens + _total_output_tokens,
        }
