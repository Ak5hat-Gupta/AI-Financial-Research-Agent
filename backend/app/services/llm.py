"""Provider-agnostic LLM client.

Supports Anthropic Claude and OpenAI, plus a fully offline ``demo`` mode that
produces sensible, deterministic analyst-style text so the whole app works with
zero API keys configured.
"""
from __future__ import annotations

import textwrap

from app.core.config import settings


class LLMClient:
    def __init__(self) -> None:
        self.provider = settings.effective_provider

    # ---- public API ----------------------------------------------------
    def complete(self, system: str, prompt: str, max_tokens: int = 1024) -> str:
        try:
            if self.provider == "ollama":
                return self._ollama(system, prompt, max_tokens)
            if self.provider == "anthropic":
                return self._anthropic(system, prompt, max_tokens)
            if self.provider == "openai":
                return self._openai(system, prompt, max_tokens)
        except Exception as exc:  # pragma: no cover - network/SDK failures
            return self._demo(system, prompt) + f"\n\n_(LLM provider error, served demo response: {exc})_"
        return self._demo(system, prompt)

    @property
    def is_live(self) -> bool:
        return self.provider in {"anthropic", "openai", "ollama"}

    # ---- providers -----------------------------------------------------
    def _anthropic(self, system: str, prompt: str, max_tokens: int) -> str:
        import anthropic

        client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        msg = client.messages.create(
            model=settings.anthropic_model,
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": prompt}],
        )
        return "".join(block.text for block in msg.content if block.type == "text").strip()

    def _openai(self, system: str, prompt: str, max_tokens: int) -> str:
        from openai import OpenAI

        client = OpenAI(api_key=settings.openai_api_key)
        resp = client.chat.completions.create(
            model=settings.openai_model,
            max_tokens=max_tokens,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": prompt},
            ],
        )
        return (resp.choices[0].message.content or "").strip()

    def _ollama(self, system: str, prompt: str, max_tokens: int) -> str:
        from ollama import Client

        client = Client(host=settings.ollama_base_url)

        response = client.chat(
            model=settings.ollama_model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": prompt},
            ],
            options={"num_predict": max_tokens},
        )
        return (response["message"]["content"] or "").strip()

    # ---- offline fallback ---------------------------------------------
    def _demo(self, system: str, prompt: str) -> str:
        """Deterministic, context-aware fallback that reads like an analyst note."""
        excerpt = prompt.strip().splitlines()
        question = ""
        for line in excerpt:
            low = line.lower()
            if low.startswith("question:") or low.startswith("user:"):
                question = line.split(":", 1)[1].strip()
        head = question or (excerpt[0][:160] if excerpt else "the request")
        return textwrap.dedent(
            f"""\
            **Analyst note (demo mode).** Run a local Ollama model, or connect an
            Anthropic or OpenAI key, for fully live reasoning. Based on the supplied
            context, here is a structured take:

            • **Read on "{head}":** the provided filing context contains the relevant
              disclosures to answer this. Key drivers center on revenue mix, margin
              trajectory and the balance-sheet position highlighted in the document.
            • **What to verify:** management's forward guidance, the MD&A risk factors,
              and any one-off items affecting reported earnings quality.
            • **Bottom line:** the evidence points to a fundamentals-led story; size any
              position against the valuation and leverage signals surfaced elsewhere in
              this workspace.

            _This response was generated locally without an LLM provider._"""
        )


def get_llm() -> LLMClient:
    return LLMClient()
