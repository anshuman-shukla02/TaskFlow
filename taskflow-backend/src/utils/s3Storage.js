const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { Upload } = require("@aws-sdk/lib-storage");
const path = require("path");

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const uploadToS3 = async (file, folder = "uploads") => {
  const fileExtension = path.extname(file.originalname);
  const fileName = `${folder}/${Date.now()}-${Math.round(Math.random() * 1e9)}${fileExtension}`;

  const parallelUploads3 = new Upload({
    client: s3Client,
    params: {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
    },
  });

  await parallelUploads3.done();

  // Return the S3 key (not public URL — we use presigned URLs for access)
  return `s3://${process.env.S3_BUCKET_NAME}/${fileName}`;
};

/**
 * Generate a presigned URL for an S3 object.
 * Works with both s3:// URIs and legacy https:// URLs.
 */
const getPresignedUrl = async (fileUrl, expiresIn = 3600) => {
  let bucket, key;

  if (fileUrl.startsWith("s3://")) {
    // New format: s3://bucket-name/key
    const parts = fileUrl.replace("s3://", "").split("/");
    bucket = parts.shift();
    key = parts.join("/");
  } else if (fileUrl.includes("amazonaws.com")) {
    // Legacy format: https://bucket.s3.region.amazonaws.com/key
    const urlObj = new URL(fileUrl);
    bucket = urlObj.hostname.split(".")[0];
    key = urlObj.pathname.substring(1); // Remove leading /
  } else {
    // Not an S3 URL, return as-is (local file)
    return fileUrl;
  }

  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(s3Client, command, { expiresIn });
};

module.exports = { uploadToS3, getPresignedUrl, s3Client };
