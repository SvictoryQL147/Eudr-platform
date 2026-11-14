from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="EUDR_")

    database_url: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/eudr_core"

    # Product name used in emails, page titles and the API docs.
    app_name: str = "Ala Trace"
    # Public address of the web app. Links in emails (password reset,
    # invitations) point here. On Vercel set it to https://your-domain.
    app_url: str = "http://localhost:3000"
    environment: str = "development"  # shown in Sentry; "production" on Vercel

    # Auth. CHANGE jwt_secret in .env before deploying anywhere public.
    jwt_secret: str = "dev-only-change-me-in-env-0123456789abcdef"
    jwt_expires_minutes: int = 60 * 12
    # Browser sessions live in an httpOnly cookie (JavaScript can't read it,
    # so an injected script can't steal it). Secure flag is switched on
    # automatically when app_url starts with https://.
    cookie_name: str = "ala_session"

    # Sign-in protection: after login_max_failures wrong passwords for one
    # email inside login_window_minutes, that email is locked for the rest
    # of the window. ip_max_failures caps guessing across many emails.
    login_max_failures: int = 5
    login_window_minutes: int = 15
    ip_max_failures: int = 30
    password_reset_max_per_hour: int = 3
    password_min_length: int = 10

    # Email (password resets, team invitations).
    #   "console" = print emails to the server log (local development)
    #   "resend"  = send through resend.com (needs resend_api_key)
    email_backend: str = "console"
    resend_api_key: str | None = None
    email_from: str = "Ala Trace <onboarding@resend.dev>"

    # Comma-separated origins allowed to call the API from a browser
    # (the Next.js dashboard). Add your deployed web URL here.
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    # Uploaded documents.
    #   "local" = files on this machine's disk under storage_dir (development)
    #   "s3"    = permanent object storage: Cloudflare R2, AWS S3 or any
    #             S3-compatible service. Required on Vercel (its disk is wiped).
    storage_backend: str = "local"
    storage_dir: str = "storage"
    s3_bucket: str | None = None
    s3_endpoint_url: str | None = None  # R2: https://<account_id>.r2.cloudflarestorage.com
    s3_region: str = "auto"  # "auto" for R2, e.g. "eu-west-2" for AWS
    s3_access_key_id: str | None = None
    s3_secret_access_key: str | None = None
    # Vercel functions accept request bodies up to ~4.5 MB; keep this at 4
    # there. Locally 15 is fine.
    max_upload_mb: int = 15

    # Error monitoring. Leave empty to switch Sentry off.
    sentry_dsn: str | None = None

    # Deforestation screening (see services/deforestation.py).
    #   "whisp" = real screening via the FAO/Forest Data Partnership Whisp API
    #             (needs whisp_api_key: sign in at whisp.openforis.org -> account page)
    #   "demo"  = fake but deterministic results for demos, clearly labelled DEMO
    #   "none"  = screening switched off
    screening_provider: str = "none"
    whisp_api_key: str | None = None
    whisp_base_url: str = "https://whisp.openforis.org"
    whisp_timeout_seconds: int = 900
    # Run screening inside the request instead of as a background task.
    # Needed on serverless hosts (Vercel), where work after the response
    # isn't guaranteed to finish. Keep whisp_timeout_seconds below the
    # function's maxDuration when this is on.
    screening_run_inline: bool = False
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
