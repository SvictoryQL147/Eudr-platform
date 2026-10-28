"use client";

import { toast } from "sonner";
import { Download, FileText, Upload } from "lucide-react";
import { useState } from "react";
import { api, downloadFile } from "@/lib/api";
import { DOCUMENT_LABELS, date } from "@/lib/format";
import type { DocumentItem, DocumentType, LinkedType } from "@/lib/types";
import { Badge, Button, ErrorBox, Field, Input, Modal, Select } from "./kit";

const TYPES_FOR: Record<LinkedType, DocumentType[]> = {
  farmer: ["farmer_id", "land_title", "other"],
  batch: ["purchase_receipt", "other"],
  shipment: ["export_certificate", "phytosanitary_certificate", "purchase_receipt", "other"],
};

export function UploadDocumentButton({
  linkedType,
  linkedId,
  defaultType,
  onUploaded,
  label = "Upload document",
}: {
  linkedType: LinkedType;
  linkedId: string;
  defaultType?: DocumentType;
  onUploaded: () => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState<DocumentType>(defaultType || TYPES_FOR[linkedType][0]);
  const [expiry, setExpiry] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return setError("Choose a file");
    setBusy(true);
    setError(null);
    const form = new FormData();
    form.append("file", file);
    form.append("document_type", docType);
    form.append("linked_to_type", linkedType);
    form.append("linked_to_id", linkedId);
    if (expiry) form.append("expiry_date", expiry);
    try {
      await api("/api/v1/documents/upload", { form, method: "POST" });
      toast.success("Document uploaded");
      setOpen(false);
      setFile(null);
      setExpiry("");
      onUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button variant="secondary" size="sm" icon={<Upload className="h-4 w-4" />} onClick={() => { setDocType(defaultType || TYPES_FOR[linkedType][0]); setOpen(true); }}>
        {label}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Upload document">
        <form className="space-y-4" onSubmit={submit}>
          <ErrorBox message={error} />
          <Field label="Document type" required>
            <Select value={docType} onChange={(e) => setDocType(e.target.value as DocumentType)}>
              {TYPES_FOR[linkedType].map((t) => (
                <option key={t} value={t}>
                  {DOCUMENT_LABELS[t]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="File" hint="PDF, JPG, PNG or WEBP, up to 15 MB. A clear phone photo is fine." required>
            <Input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </Field>
          <Field label="Expiry date" hint="Leave empty if the document doesn't expire">
            <Input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={busy}>
              Upload
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function DocumentList({ docs, empty = "No documents yet." }: { docs: DocumentItem[] | null; empty?: string }) {
  if (!docs || docs.length === 0) return <p className="px-5 py-5 text-sm text-muted-foreground">{empty}</p>;
  const today = new Date().toISOString().slice(0, 10);
  return (
    <ul className="divide-y divide-border">
      {docs.map((d) => {
        const expired = d.expiry_date && d.expiry_date < today;
        return (
          <li key={d.id} className="flex items-center gap-3 px-5 py-3">
            <FileText className="h-5 w-5 flex-none text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{DOCUMENT_LABELS[d.document_type]}</p>
              <p className="truncate text-xs text-muted-foreground">
                {d.original_filename || "External file"} · uploaded {date(d.uploaded_at)}
                {d.expiry_date && <> · expires {date(d.expiry_date)}</>}
              </p>
            </div>
            {expired && <Badge tone="red">Expired</Badge>}
            {d.has_file && (
              <Button
                variant="ghost"
                size="sm"
                icon={<Download className="h-4 w-4" />}
                onClick={() => downloadFile(`/api/v1/documents/${d.id}/file`, d.original_filename || "document")}
              >
                <span className="sr-only sm:not-sr-only">Download</span>
              </Button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
