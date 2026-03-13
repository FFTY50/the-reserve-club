# Content from https://unpkg.com/@lovable.dev/email-js@0.0.2/dist/index.js

// src/email.ts
var DEFAULT\_AUTH\_HEADER = "Authorization";
var DEFAULT\_API\_BASE\_URL = "https://api.lovable.dev";
var DEFAULT\_SEND\_PATH = "/v1/messaging/email/send";
function buildAuthHeaderValue(apiKey) {
 return \`Bearer ${apiKey}\`;
}
async function sendLovableEmail(payload, options) {
 const apiKey = options.apiKey;
 if (!apiKey) {
 throw new Error("Missing Lovable API key");
 }
 const authHeader = options.authHeader ?? DEFAULT\_AUTH\_HEADER;
 const sendUrl = options.sendUrl;
 const apiBaseUrl = options.apiBaseUrl ?? DEFAULT\_API\_BASE\_URL;
 const url = sendUrl \|\| \`${apiBaseUrl.replace(/\\/$/, "")}${DEFAULT\_SEND\_PATH}\`;
 const idempotencyKey = options.idempotencyKey ?? payload.idempotency\_key ?? payload.run\_id;
 const headers = {
 \[authHeader\]: buildAuthHeaderValue(apiKey),
 "Content-Type": "application/json"
 };
 if (idempotencyKey) {
 headers\["Idempotency-Key"\] = idempotencyKey;
 }
 const response = await fetch(url, {
 method: "POST",
 headers,
 body: JSON.stringify(payload)
 });
 if (!response.ok) {
 const errorText = await response.text();
 const safeErrorText = errorText.length > 500 ? \`${errorText.slice(0, 500)}...\` : errorText;
 throw new Error(\`Email API error: ${response.status} ${safeErrorText}\`);
 }
 return await response.json();
}

// src/webhook.ts
function parseEmailWebhookPayload(body) {
 const parsed = JSON.parse(body);
 if (!parsed \|\| typeof parsed !== "object") {
 throw new Error("Invalid email webhook payload: missing version or type");
 }
 const payload = parsed;
 if (typeof payload.version !== "string" \|\| typeof payload.type !== "string") {
 throw new Error("Invalid email webhook payload: missing version or type");
 }
 return payload;
}
export {
 parseEmailWebhookPayload,
 sendLovableEmail
};