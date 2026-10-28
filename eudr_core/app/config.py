from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="EUDR_")

    database_url: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/eudr_core"

    # Auth. CHANGE jwt_secret in .env before deploying anywhere public.
    jwt_secret: str = "dev-only-change-me-in-env-0123456789abcdef"
    jwt_expires_minutes: int = 60 * 12

    # Comma-separated origins allowed to call the API from a browser
    # (the Next.js dashboard). Add your deployed web URL here.
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    # Uploaded documents are stored on local disk under this folder.
    # Swap for S3/R2 object storage before running more than one server.
    storage_dir: str = "storage"
    max_upload_mb: int = 15

    # Deforestation screening (see services/deforestation.py).
    #   "whisp" = real screening via the FAO/Forest Data Partnership Whisp API
    #             (needs whisp_api_key: sign in at whisp.openforis.org -> account page)
    #   "demo"  = fake but deterministic results for demos, clearly labelled DEMO
    #   "none"  = screening switched off
    screening_provider: str = "none"
    whisp_api_key: str | None = None
    whisp_base_url: str = "https://whisp.openforis.org"
    whisp_timeout_seconds: int = 900
    whisp_batch_size: int = 500
    # Optional ISO2 codes to add national datasets in Whisp, e.g. "ci,gh". Leave
    # empty unless Whisp lists national layers for the country.
    whisp_national_codes: str = ""

    # EUDR application date for large/medium operators (Reg. 2025/2650).
    eudr_deadline: str = "2026-12-30"

    # OCR: provider-agnostic per the strategy doc (section 10) — never hard
    # lock to one vendor. "mock" is what local dev/tests run against.
    ocr_backend: str = "mock"
    ocr_provider_api_key: str | None = None

    # Rule thresholds — starting points, not calibrated against real pilot
    # data. See services/rules/*.py docstrings for where each number came
    # from and why it should move once you have real farm data.
    min_plausible_farm_hectares: float = 0.05
    max_plausible_farm_hectares: float = 50.0
    max_cocoa_yield_kg_per_hectare: float = 1200.0  # generous upper bound; tune locally
    farm_overlap_area_ratio_threshold: float = 0.3  # IoU above this = flag as possible duplicate
    batch_quantity_tolerance_ratio: float = 0.05  # 5% slack between summed inputs and output
    collection_over_harvest_tolerance_ratio: float = 0.10  # 10% slack, accounts for scale variance

    # Readiness scoring weights, subtracted from 100 per finding severity.
    severity_weight_critical: int = 40
    severity_weight_high: int = 20
    severity_weight_medium: int = 10
    severity_weight_low: int = 5


@lru_cache
def get_settings() -> Settings:
    return Settings()
