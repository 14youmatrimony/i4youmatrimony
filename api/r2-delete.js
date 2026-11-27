import crypto from 'node:crypto';

function getR2Env() {
  const endpoint = (process.env.VITE_R2_ENDPOINT || process.env.R2_ENDPOINT || 'https://60ba75772b194956aea9a7080138d7e0.r2.cloudflarestorage.com').replace(/\/+$/, '');
  const accessKeyId = process.env.VITE_R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID || '4eb0c79fe5884a7df815017ee19f7171';
  const secretAccessKey = process.env.VITE_R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY || 'f33f804f8d0858ce476bcc6a72ddd54a1a577a7d3072da11672af6b4edb33486';
  const bucketName = process.env.VITE_R2_BUCKET_NAME || process.env.R2_BUCKET_NAME || 'i4youmatrimony';
  return { endpoint, accessKeyId, secretAccessKey, bucketName, region: 'auto' };
}

function sha256Hex(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function hmacSha256(key, msg) {
  return crypto.createHmac('sha256', key).update(msg).digest();
}

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    let filePath = String(body.objectKey || body.url || '').split('?')[0].trim();

    if (filePath.includes('r2.dev/')) {
      filePath = filePath.split('r2.dev/')[1];
    } else if (filePath.includes('.r2.cloudflarestorage.com/')) {
      const parts = filePath.split('.r2.cloudflarestorage.com/')[1];
      const slashIdx = parts.indexOf('/');
      filePath = slashIdx !== -1 ? parts.substring(slashIdx + 1) : parts;
    }

    const { endpoint, accessKeyId, secretAccessKey, bucketName, region } = getR2Env();
    filePath = filePath.replace(/^\/+/, '');
    if (filePath.startsWith(`${bucketName}/`)) {
      filePath = filePath.substring(bucketName.length + 1);
    }
    filePath = filePath.replace(/^\/+/, '');

    if (!filePath) {
      return res.status(400).json({ success: false, error: 'Could not extract R2 object key' });
    }

    const urlObj = new URL(endpoint);
    const host = urlObj.host;
    const deleteUrl = `${endpoint}/${bucketName}/${filePath}`;
    const canonicalUri = `/${encodeURIComponent(bucketName)}/${filePath.split('/').map(encodeURIComponent).join('/')}`;

    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.substring(0, 8);
    const emptyPayloadHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

    const canonicalHeaders =
      `host:${host}\n` +
      `x-amz-content-sha256:${emptyPayloadHash}\n` +
      `x-amz-date:${amzDate}\n`;
    const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
    const canonicalRequest = `DELETE\n${canonicalUri}\n\n${canonicalHeaders}\n${signedHeaders}\n${emptyPayloadHash}`;
    const canonicalReqHash = sha256Hex(canonicalRequest);
    const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
    const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${canonicalReqHash}`;

    const kDate = hmacSha256(`AWS4${secretAccessKey}`, dateStamp);
    const kRegion = hmacSha256(kDate, region);
    const kService = hmacSha256(kRegion, 's3');
    const kSigning = hmacSha256(kService, 'aws4_request');
    const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');
    const authHeader = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const r2Res = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        'x-amz-date': amzDate,
        'x-amz-content-sha256': emptyPayloadHash,
        'Authorization': authHeader
      }
    });

    if (!r2Res.ok && r2Res.status !== 404) {
      const errText = await r2Res.text().catch(() => '');
      return res.status(r2Res.status).json({
        success: false,
        error: `Cloudflare R2 delete failed (${r2Res.status}): ${errText || r2Res.statusText}`
      });
    }

    return res.status(200).json({ success: true, filePath });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'Server R2 delete error'
    });
  }
}
