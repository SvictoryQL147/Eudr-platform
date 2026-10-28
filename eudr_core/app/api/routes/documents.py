import re
import uuid
from datetime import date
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.auth import get_current_user, get_owned
from app.config import Settings, get_settings
from app.database import get_db
from app.models import core as models
from app.schemas.core import DocumentCreate, DocumentOut
from app.services.ocr import get_ocr_service

router = APIRouter(prefix="/api/v1/documents", tags=["documents"])

_ALLOWED_TYPES = {
    "application/pdf": ".pdf",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}
_LINK_MODELS = {
    models.LinkedEntityType.FARMER: (models.Farmer, "Farmer"),
    models.LinkedEntityType.BATCH: (models.Batch, "Batch"),
    models.LinkedEntityType.SHIPMENT: (models.Shipment, "Shipment"),
}


def _out(d: models.Document) -> DocumentOut:
    out = DocumentOut.model_validate(d)
    out.has_file = bool(d.object_key and d.object_key.startswith("local:"))
    return out


def _parse_enums(document_type: str, linked_to_type: str):
    try:
        return models.DocumentType(document_type), models.LinkedEntityType(linked_to_type)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


def _check_link(db: Session, linked_to_type: models.LinkedEntityType, linked_to_id: str, user: models.User):
    model, label = _LINK_MODELS[linked_to_type]
    get_owned(db, model, linked_to_id, user, label)


def _run_ocr(document: models.Document, data: bytes, settings: Settings):
    extraction = get_ocr_service(settings).extract(document_bytes=data, document_type=document.document_type.value)
    document.extracted_fields = extraction.fields
    document.extraction_confidence = extraction.confidence


@router.get("", response_model=list[DocumentOut])
def list_documents(
    linked_to_id: str | None = Query(default=None),
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(models.Document).filter(models.Document.organization_id == user.organization_id)
    if linked_to_id:
        query = query.filter(models.Document.linked_to_id == linked_to_id)
    return [_out(d) for d in query.order_by(models.Document.uploaded_at.desc()).all()]


@router.post("", response_model=DocumentOut, status_code=status.HTTP_201_CREATED)
def create_document(
    payload: DocumentCreate,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    """Registers a document that already lives in external object storage
    (object_key). For uploading the file itself, use POST /documents/upload."""
    document_type, linked_to_type = _parse_enums(payload.document_type, payload.linked_to_type)
    _check_link(db, linked_to_type, payload.linked_to_id, user)
    document = models.Document(
        organization_id=user.organization_id,
        document_type=document_type,
        linked_to_type=linked_to_type,
        linked_to_id=payload.linked_to_id,
        object_key=payload.object_key,
        expiry_date=payload.expiry_date,
    )
    db.add(document)
    db.flush()
    _run_ocr(document, b"", settings)
    db.commit()
    db.refresh(document)
    return _out(document)


@router.post("/upload", response_model=DocumentOut, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    document_type: str = Form(...),
    linked_to_type: str = Form(...),
    linked_to_id: str = Form(...),
    expiry_date: date | None = Form(default=None),
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    """Uploads a PDF or photo (certificate, ID, receipt) and links it to a
    farmer, batch or shipment. Stored on local disk under storage_dir."""
    doc_type, link_type = _parse_enums(document_type, linked_to_type)
    _check_link(db, link_type, linked_to_id, user)

    content_type = (file.content_type or "").lower()
    if content_type not in _ALLOWED_TYPES:
        raise HTTPException(status_code=415, detail="Upload a PDF, JPG, PNG or WEBP file")
    data = await file.read()
    if len(data) == 0:
        raise HTTPException(status_code=422, detail="The file is empty")
    if len(data) > settings.max_upload_mb * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"File is larger than {settings.max_upload_mb} MB")

    safe_name = re.sub(r"[^A-Za-z0-9._-]+", "_", file.filename or "document")[:120]
    rel = Path(str(user.organization_id)) / f"{uuid.uuid4().hex}{_ALLOWED_TYPES[content_type]}"
    dest = Path(settings.storage_dir) / rel
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(data)

    document = models.Document(
        organization_id=user.organization_id,
        document_type=doc_type,
        linked_to_type=link_type,
        linked_to_id=linked_to_id,
        object_key=f"local:{rel.as_posix()}",
        original_filename=safe_name,
        content_type=content_type,
        size_bytes=len(data),
        expiry_date=expiry_date,
    )
    db.add(document)
    db.flush()
    _run_ocr(document, data, settings)
    db.commit()
    db.refresh(document)
    return _out(document)


@router.get("/{document_id}/file")
def download_document(
    document_id: str,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    document = get_owned(db, models.Document, document_id, user, "Document")
    if not document.object_key.startswith("local:"):
        raise HTTPException(status_code=404, detail="This document has no uploaded file")
    root = Path(settings.storage_dir).resolve()
    path = (root / document.object_key[len("local:"):]).resolve()
    if root not in path.parents or not path.is_file():
        raise HTTPException(status_code=404, detail="File missing from storage")
    return FileResponse(path, media_type=document.content_type, filename=document.original_filename or path.name)
