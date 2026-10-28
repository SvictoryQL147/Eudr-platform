"""
Section 10 of the strategy doc is explicit: "provider-agnostic OCR + LLM
layer... avoid hard vendor lock-in." This interface is that boundary.
MockOcrService is what runs in dev/tests. A real implementation — Mistral
OCR, a Groq vision model (matches the LLM provider already used
elsewhere in this build), or a frontier VLM fallback per the strategy
doc's document-intelligence architecture — plugs in behind the same
`extract()` signature without anything upstream changing.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass

from app.config import Settings


@dataclass
class ExtractionResult:
    fields: dict  # e.g. {"certificate_number": "...", "expiry_date": "2027-01-01", ...}
    confidence: float  # 0-1


class OcrService(ABC):
    @abstractmethod
    def extract(self, document_bytes: bytes, document_type: str) -> ExtractionResult:
        ...


class MockOcrService(OcrService):
    def extract(self, document_bytes: bytes, document_type: str) -> ExtractionResult:
        return ExtractionResult(fields={}, confidence=0.0)


class UnconfiguredOcrService(OcrService):
    """Raised deliberately rather than silently returning empty results —
    a misconfigured production deployment should fail loudly, not quietly
    skip extraction on every document."""

    def extract(self, document_bytes: bytes, document_type: str) -> ExtractionResult:
        raise NotImplementedError(
            "No OCR provider configured. Set EUDR_OCR_BACKEND to a real provider "
            "and implement its OcrService subclass before enabling it."
        )


def get_ocr_service(settings: Settings) -> OcrService:
    if settings.ocr_backend == "mock":
        return MockOcrService()
    raise ValueError(
        f"Unknown OCR backend: {settings.ocr_backend!r}. Only 'mock' is implemented; "
        "wire up a real provider in app/services/ocr.py before using another value."
    )
