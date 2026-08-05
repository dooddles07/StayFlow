import { Router } from 'express'
import { createUploadSignature } from '../controllers/upload.controller.js'
import { requireRole } from '../middleware/auth.middleware.js'
import { uploadSignatureLimiter } from '../middleware/rateLimit.middleware.js'

const router = Router()

// MANAGEMENT-only: the same set that can edit facility/event/restaurant photos.
// Anyone holding a signature can write into the account's Cloudinary folder.
router.post(
  '/signature',
  uploadSignatureLimiter,
  requireRole('MANAGEMENT'),
  createUploadSignature,
)

export default router
