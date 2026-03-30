/**
 * Multer middleware — stores files in memory (Buffer)
 * so we can write them into MySQL LONGBLOB columns.
 */
const multer = require('multer');

const storage = multer.memoryStorage();

const fileFilter = (_req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, GIF, and WebP images are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB per file
    files: 10,                  // max 10 files per request
  },
});

module.exports = upload;
