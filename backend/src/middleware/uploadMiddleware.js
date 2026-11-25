import { randomUUID } from 'node:crypto'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import multer from 'multer'
import { uploadsDirectory } from '../config/storage.js'

const allowedTypes = {
  image: new Map([
    ['image/jpeg', '.jpg'],
    ['image/png', '.png'],
    ['image/webp', '.webp'],
  ]),
  audioEn: new Map([
    ['audio/mpeg', '.mp3'],
    ['audio/mp3', '.mp3'],
    ['audio/wav', '.wav'],
    ['audio/x-wav', '.wav'],
    ['audio/ogg', '.ogg'],
    ['audio/mp4', '.m4a'],
    ['audio/x-m4a', '.m4a'],
  ]),
  audioKn: new Map([
    ['audio/mpeg', '.mp3'],
    ['audio/mp3', '.mp3'],
    ['audio/wav', '.wav'],
    ['audio/x-wav', '.wav'],
    ['audio/ogg', '.ogg'],
    ['audio/mp4', '.m4a'],
    ['audio/x-m4a', '.m4a'],
  ]),
}

const storage = multer.diskStorage({
  destination(request, file, callback) {
    const subdirectory =
      file.fieldname === 'image'
        ? 'exhibits'
        : file.fieldname === 'audioKn'
          ? path.join('audio', 'kannada')
          : path.join('audio', 'english')
    const directory = path.join(uploadsDirectory, subdirectory)
    mkdir(directory, { recursive: true })
      .then(() => callback(null, directory))
      .catch(callback)
  },
  filename(_request, file, callback) {
    const extension = allowedTypes[file.fieldname]?.get(file.mimetype)
    if (!extension) {
      callback(new Error('Unsupported media type.'))
      return
    }
    callback(null, `${randomUUID()}${extension}`)
  },
})

export const exhibitMediaUpload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024, files: 3 },
  fileFilter(_request, file, callback) {
    if (!allowedTypes[file.fieldname]?.has(file.mimetype)) {
      callback(new Error('Choose a supported image or audio file.'))
      return
    }
    callback(null, true)
  },
}).fields([
  { name: 'image', maxCount: 1 },
  { name: 'audioEn', maxCount: 1 },
  { name: 'audioKn', maxCount: 1 },
])

const svgStorage = multer.diskStorage({
  destination(_request, _file, callback) {
    const directory = path.join(uploadsDirectory, 'floorplans')
    mkdir(directory, { recursive: true })
      .then(() => callback(null, directory))
      .catch(callback)
  },
  filename(_request, _file, callback) {
    callback(null, `${randomUUID()}.svg`)
  },
})

export const floorplanUpload = multer({
  storage: svgStorage,
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter(_request, file, callback) {
    if (
      file.mimetype !== 'image/svg+xml' ||
      path.extname(file.originalname).toLowerCase() !== '.svg'
    ) {
      callback(new Error('Upload an SVG floorplan file.'))
      return
    }
    callback(null, true)
  },
}).single('file')

export function handleUploadError(error, _request, _response, next) {
  if (error instanceof multer.MulterError) {
    const uploadError = new Error(
      error.code === 'LIMIT_FILE_SIZE'
        ? 'The uploaded file exceeds the allowed size.'
        : 'The uploaded file could not be accepted.',
    )
    uploadError.statusCode = 400
    next(uploadError)
    return
  }
  if (error.message === 'Unsupported media type.' ||
      error.message === 'Choose a supported image or audio file.' ||
      error.message === 'Upload an SVG floorplan file.') {
    error.statusCode = 400
  }
  next(error)
}
