import crypto from 'node:crypto';

const DEFAULT_PUBLIC_R2 = 'https://pub-aca69ed1690f4d8a898c51f8a3166042.r2.dev';

function getR2Env() {
  const endpoint = (process.env.VITE_R2_ENDPOINT || process.env.R2_ENDPOINT || 'https://60ba75772b194956aea9a7080138d7e0.r2.cloudflarestorage.com').replace(/\/+$/, '');
  const accessKeyId = process.env.VITE_R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID || '4eb0c79fe5884a7df815017ee19f7171';
  const secretAccessKey = process.env.VITE_R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY || 'f33f804f8d0858ce476bcc6a72ddd54a1a577a7d3072da11672af6b4edb33486';
  const bucketName = process.env.VITE_R2_BUCKET_NAME || process.env.R2_BUCKET_NAME || 'i4youmatrimony';
  let publicUrl = (process.env.VITE_R2_PUBLIC_URL || process.env.R2_PUBLIC_URL || DEFAULT_PUBLIC_R2).replace(/\/+$/, '');
  if (!publicUrl || publicUrl.includes('dash.cloudflare.com')) {
    publicUrl = DEFAULT_PUBLIC_R2;
  }
  return { endpoint, accessKeyId, secretAccessKey, bucketName, publicUrl, region: 'auto' };
}

function sha256Hex(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function hmacSha256(key, msg) {
  return crypto.createHmac('sha256', key).update(msg).digest();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { base64, contentType = 'image/webp', prefix = 'banners', ext = 'webp' } = body;

    if (!base64 || typeof base64 !== 'string') {
      return res.status(400).json({ success: false, error: 'Missing base64 image payload' });
    }

    const cleanBase64 = base64.includes(',') ? base64.split(',')[1] : base64;
    const buffer = Buffer.from(cleanBase64, 'base64');
    if (!buffer || buffer.length === 0) {
      return res.status(400).json({ success: false, error: 'Empty image buffer' });
    }

    const cleanPrefix = String(prefix || 'banners').replace(/[^a-zA-Z0-9_-]/g, '');
    const cleanExt = String(ext || 'webp').replace(/[^a-zA-Z0-9]/g, '') || 'webp';
    const objectKey = `${cleanPrefix}/${cleanPrefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${cleanExt}`;

    const { endpoint, accessKeyId, secretAccessKey, bucketName, publicUrl, region } = getR2Env();
    const urlObj = new URL(endpoint);
    const host = urlObj.host;
    const uploadUrl = `${endpoint}/${bucketName}/${objectKey}`;
    const canonicalUri = `/${encodeURIComponent(bucketName)}/${objectKey.split('/').map(encodeURIComponent).join('/')}`;

    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.substring(0, 8);
    const payloadHash = sha256Hex(buffer);

    const canonicalHeaders =
      `content-type:${contentType}\n` +
      `host:${host}\n` +
      `x-amz-content-sha256:${payloadHash}\n` +
      `x-amz-date:${amzDate}\n`;
    const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';
    const canonicalRequest = `PUT\n${canonicalUri}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
    const canonicalReqHash = sha256Hex(canonicalRequest);
    const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
    const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${canonicalReqHash}`;

    const kDate = hmacSha256(`AWS4${secretAccessKey}`, dateStamp);
    const kRegion = hmacSha256(kDate, region);
    const kService = hmacSha256(kRegion, 's3');
    const kSigning = hmacSha256(kService, 'aws4_request');
    const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');
    const authHeader = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const r2Res = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
        'x-amz-date': amzDate,
        'x-amz-content-sha256': payloadHash,
        'Authorization': authHeader
      },
      body: buffer
    });

    if (!r2Res.ok) {
      const errText = await r2Res.text().catch(() => '');
      return res.status(r2Res.status).json({
        success: false,
        error: `Cloudflare R2 upload failed (${r2Res.status}): ${errText || r2Res.statusText}`
      });
    }

    const finalPublicUrl = `${publicUrl}/${objectKey}`;
    return res.status(200).json({
      success: true,
      objectKey,
      publicUrl: finalPublicUrl,
      sizeKB: Math.max(1, Math.round(buffer.length / 1024))
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'Server R2 upload error'
    });
  }
}
