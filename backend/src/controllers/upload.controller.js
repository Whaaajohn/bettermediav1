import { saveUploadDataUrl } from "../services/storage.service.js";

export async function uploadDataUrl(req, res) {
  try {
    const upload = await saveUploadDataUrl({
      dataUrl: req.body.dataUrl,
      filename: req.body.filename || req.body.name || "upload",
    });
    res.status(201).json(upload);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message || "Could not upload file" });
  }
}
