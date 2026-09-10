/**
 * What the file pickers offer for lesson attachments and assignment uploads.
 *
 * Only a hint: the backend is the authority and validates the real bytes, not
 * the extension. It mirrors `ALLOWED_UPLOAD_MIMES` / `MAX_UPLOAD_BYTES` in
 * `backend/core/config.py`, whose defaults are PDF only and 10 MB. Widen the
 * backend first -- if these two disagree, the picker lets a file through and
 * the server rejects it, which is exactly the confusion this avoids.
 */
export const ACCEPTED_UPLOAD_TYPES = "application/pdf,.pdf";
export const MAX_UPLOAD_MB = 10;
