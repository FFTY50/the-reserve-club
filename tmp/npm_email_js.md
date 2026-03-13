# Content from https://www.npmjs.com/package/@lovable.dev/email-js

# @lovable.dev/email-js  ![TypeScript icon, indicating that this package has built-in type declarations](https://static-production.npmjs.com/4a2a680dfcadf231172b78b1d3beb975.svg)

0.0.2 • Public • Published 13 days ago

- [Readme](https://www.npmjs.com/package/@lovable.dev/email-js?activeTab=readme)
- [Code Beta](https://www.npmjs.com/package/@lovable.dev/email-js?activeTab=code)
- [1 Dependency](https://www.npmjs.com/package/@lovable.dev/email-js?activeTab=dependencies)
- [0 Dependents](https://www.npmjs.com/package/@lovable.dev/email-js?activeTab=dependents)
- [2 Versions](https://www.npmjs.com/package/@lovable.dev/email-js?activeTab=versions)

# @lovable.dev/email-js

[Permalink: @lovable.dev/email-js](https://www.npmjs.com/package/@lovable.dev/email-js#lovabledevemail-js)

Utilities for Lovable email hooks and delivery.

## Installation

[Permalink: Installation](https://www.npmjs.com/package/@lovable.dev/email-js#installation)

```
npm install @lovable.dev/email-js
```

## Usage

[Permalink: Usage](https://www.npmjs.com/package/@lovable.dev/email-js#usage)

```
import { parseEmailWebhookPayload, sendLovableEmail } from "@lovable.dev/email-js";
import { verifyWebhookRequest, type EmailWebhookPayload } from "@lovable.dev/webhooks-js";

const apiKey = Deno.env.get("LOVABLE_API_KEY");

export async function handleWebhook(req: Request) {
  if (!apiKey) {
    throw new Error("Missing Lovable API key");
  }

  const { body } = await verifyWebhookRequest<EmailWebhookPayload>({
    req,
    secret: apiKey,
  });
  const payload = parseEmailWebhookPayload(body);
  if (payload.version !== "1") {
    throw new Error(`Unsupported payload version: ${payload.version}`);
  }
  if (!payload.run_id) {
    throw new Error("Missing run_id");
  }

  const apiBaseUrl = payload.data?.api_base_url ?? "https://api.lovable.dev";

  await sendLovableEmail(
    {
      run_id: payload.run_id,
      to: payload.data?.email ?? "",
      from: "My App <noreply@example.com>",
      subject: "Welcome",
      html: "<p>Hello</p>",
      text: "Hello",
      purpose: "transactional",
    },
    { apiKey, apiBaseUrl },
  );
}
```

You can also override the idempotency key (defaults to `run_id`).

## Readme

### Keywords

- [lovable](https://www.npmjs.com/search?q=keywords:lovable)
- [email](https://www.npmjs.com/search?q=keywords:email)
- [webhook](https://www.npmjs.com/search?q=keywords:webhook)

Viewing @lovable.dev/email-js version 0.0.2