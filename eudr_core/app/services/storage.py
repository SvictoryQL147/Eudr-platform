"""
Document file storage.

`local`: files on disk under storage_dir — fine on your own computer.
`s3`: permanent object storage. Works with Cloudflare R2 (no egress fees,
recommended), AWS S3, Backblaze B2 or MinIO — anything that speaks the S3
API. Required on Vercel, whose disk is wiped between requests.

Object keys are stored on the Document row with a backend prefix
("local:..." or "s3:...") so files uploaded before a switch keep working.
"""
from pathlib import Path

from app.config import Settings


class StorageError(Exception):
    pass


class LocalStorage:
    prefix = "local"

    def __init__(self, root: str):
        self.root = Path(root)

    def put(self, key: str, data: bytes, content_type: str) -> str:
        dest = self.root / key
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(data)
        return f"local:{key}"

    def _path(self, key: str) -> Path:
        root = self.root.resolve()
        path = (root / key).resolve()
        if root not in path.parents:
            raise StorageError("Invalid key")
        return path

    def get(self, key: str) -> bytes:
        path = self._path(key)
        if not path.is_file():
            raise StorageError("File missing from storage")
        return path.read_bytes()

    def link(self, key: str, filename: str, content_type: str) -> str | None:
        return None  # served through the API


class S3Storage:
    prefix = "s3"

    def __init__(self, settings: Settings):
        import boto3
        from botocore.config import Config

        if not settings.s3_bucket:
            raise StorageError("EUDR_S3_BUCKET is not set")
        self.bucket = settings.s3_bucket
        self.client = boto3.client(
            "s3",
            endpoint_url=settings.s3_endpoint_url or None,
            region_name=settings.s3_region,
            aws_access_key_id=settings.s3_access_key_id,
            aws_secret_access_key=settings.s3_secret_access_key,
            config=Config(signature_version="s3v4", retries={"max_attempts": 3}),
        )

    def put(self, key: str, data: bytes, content_type: str) -> str:
        extra = {} if self._is_r2() else {"ServerSideEncryption": "AES256"}  # R2 always encrypts
        self.client.put_object(Bucket=self.bucket, Key=key, Body=data, ContentType=content_type, **extra)
        return f"s3:{key}"

    def _is_r2(self) -> bool:
        return "r2.cloudflarestorage.com" in (self.client.meta.endpoint_url or "")

    def get(self, key: str) -> bytes:
        try:
            return self.client.get_object(Bucket=self.bucket, Key=key)["Body"].read()
        except Exception as exc:  # botocore ClientError etc.
            raise StorageError("File missing from storage") from exc

    def link(self, key: str, filename: str, content_type: str) -> str:
        """Short-lived signed download link (60 s), so large files don't
        pass through the API function."""
        safe = filename.replace('"', "")
        return self.client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket, "Key": key,
                    "ResponseContentDisposition": f'attachment; filename="{safe}"',
                    "ResponseContentType": content_type},
            ExpiresIn=60,
        )


_S3_CACHE: dict[tuple, S3Storage] = {}


def _s3(settings: Settings) -> S3Storage:
    key = (settings.s3_bucket, settings.s3_endpoint_url, settings.s3_region, settings.s3_access_key_id)
    if key not in _S3_CACHE:
        _S3_CACHE[key] = S3Storage(settings)
    return _S3_CACHE[key]


_s3.cache_clear = _S3_CACHE.clear  # type: ignore[attr-defined]


def get_storage(settings: Settings):
    """Storage used for new uploads."""
    if settings.storage_backend == "s3":
        return _s3(settings)
    return LocalStorage(settings.storage_dir)


def storage_for_key(object_key: str, settings: Settings):
    """(storage, key) able to read an existing object_key, or None."""
    if not object_key:
        return None
    scheme, _, key = object_key.partition(":")
    if scheme == "local" and key:
        return LocalStorage(settings.storage_dir), key
    if scheme == "s3" and key:
        return _s3(settings), key
    return None
