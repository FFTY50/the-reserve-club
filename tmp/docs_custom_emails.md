# Content from https://docs.lovable.dev/features/custom-emails

[Skip to main content](https://docs.lovable.dev/features/custom-emails#content-area)

[Lovable Documentation home page![light logo](https://mintcdn.com/lovable-f9060f1e/lZT1ihBcprll2Agr/assets/logo/logoblack.svg?fit=max&auto=format&n=lZT1ihBcprll2Agr&q=85&s=8d9eafaf19f94e27f0d13ac160d54f54)![dark logo](https://mintcdn.com/lovable-f9060f1e/lZT1ihBcprll2Agr/assets/logo/logowhite.svg?fit=max&auto=format&n=lZT1ihBcprll2Agr&q=85&s=fed1a7a9be6502f49d06a55cec77288c)](https://lovable.dev/)

Search...

Ctrl KAsk AI

Search...

Navigation

Build

Send custom authentication emails from your own domain

[Introduction](https://docs.lovable.dev/introduction/welcome) [Features](https://docs.lovable.dev/features/plan-mode) [Integrations](https://docs.lovable.dev/integrations/introduction) [Tips & Tricks](https://docs.lovable.dev/tips-tricks/best-practice) [Changelog](https://docs.lovable.dev/changelog)

On this page

- [What are custom emails](https://docs.lovable.dev/features/custom-emails#what-are-custom-emails)
- [Supported custom email types](https://docs.lovable.dev/features/custom-emails#supported-custom-email-types)
- [Availability and usage](https://docs.lovable.dev/features/custom-emails#availability-and-usage)
- [Why use custom emails](https://docs.lovable.dev/features/custom-emails#why-use-custom-emails)
- [Prerequisites](https://docs.lovable.dev/features/custom-emails#prerequisites)
- [How custom emails work](https://docs.lovable.dev/features/custom-emails#how-custom-emails-work)
- [Email domain scope and usage](https://docs.lovable.dev/features/custom-emails#email-domain-scope-and-usage)
- [Add an email domain](https://docs.lovable.dev/features/custom-emails#add-an-email-domain)
- [Email domain statuses](https://docs.lovable.dev/features/custom-emails#email-domain-statuses)
- [Managing email domains](https://docs.lovable.dev/features/custom-emails#managing-email-domains)
- [Analytics and logs](https://docs.lovable.dev/features/custom-emails#analytics-and-logs)
- [Customize authentication email templates](https://docs.lovable.dev/features/custom-emails#customize-authentication-email-templates)
- [Automatic branding](https://docs.lovable.dev/features/custom-emails#automatic-branding)
- [What you can customize](https://docs.lovable.dev/features/custom-emails#what-you-can-customize)
- [Edit templates manually](https://docs.lovable.dev/features/custom-emails#edit-templates-manually)
- [Email deliverability best practices](https://docs.lovable.dev/features/custom-emails#email-deliverability-best-practices)
- [Troubleshooting](https://docs.lovable.dev/features/custom-emails#troubleshooting)
- [FAQ](https://docs.lovable.dev/features/custom-emails#faq)

## [​](https://docs.lovable.dev/features/custom-emails\#what-are-custom-emails)  What are custom emails

Custom emails allow your Lovable Cloud app to send authentication emails (signup confirmations, password resets, magic links, invitations, and more) from your own email domain instead of the default Lovable Cloud Auth sender.For example: `noreply@notify.yourdomain.com` or `noreply@yourdomain.com`Using a dedicated sending subdomain helps protect your root domain’s reputation while keeping your branding consistent.You can customize:

- Which email domain your project uses
- The sender subdomain configuration
- Email branding and visual style
- Authentication email templates and subject lines

Lovable handles domain verification, DNS configuration, email authentication (`SPF`, `DKIM`, and `DMARC`), and delivery infrastructure. No external email provider accounts or API keys are required.

## [​](https://docs.lovable.dev/features/custom-emails\#supported-custom-email-types)  Supported custom email types

At the moment, custom emails support **authentication emails only**.Authentication emails are a type of transactional email related to account access and identity verification. They are automatically triggered by Cloud Auth when users perform specific security-related actions.These authentication emails include:

- **Confirm signup**


Sent when a user creates an account and email confirmation is enabled. Verifies that the user owns the email address before activating the account.
- **Password reset**


Sent when a user requests to reset their password. Allows secure password recovery.
- **Magic link**


Sent when passwordless login is enabled and a user requests a login link. Authenticates the user without requiring a password. You can ask Lovable to enable magic link authentication if it is not already configured.
- **Invite**


Sent when you invite a user to join your project (from Cloud → Users). Grants account access through a secure invitation link.
- **Email change**


Sent when a user updates their email address. Confirms ownership of the new address before applying the change.
- **Reauthentication**


Sent when a user must verify their identity before performing a sensitive action, such as changing a password. Typically includes a short-lived verification code. You can ask Lovable to enable reauthentication if it is not already configured.

Marketing emails, newsletters, order confirmations, shipping notifications, and other transactional or notification emails are not supported at the moment.

## [​](https://docs.lovable.dev/features/custom-emails\#availability-and-usage)  Availability and usage

Custom emails are available on **paid plans**. Each paid workspace includes **50,000 authentication emails per month** at no additional cost. Usage is calculated across the entire workspace.Additional authentication emails are billed at $1 per 1,000 emails.

## [​](https://docs.lovable.dev/features/custom-emails\#why-use-custom-emails)  Why use custom emails

- **Better deliverability:** Emails sent from your own domain are more likely to reach the inbox instead of spam.
- **More trust:** Users see your domain in the From address, reinforcing credibility.
- **Consistent branding:** Authentication emails match your product identity.
- **Managed setup:** Lovable verifies your domain and configures the required DNS records.
- **Authenticated sending:** Lovable automatically sets up [SPF, DKIM, and DMARC](https://docs.lovable.dev/features/custom-emails#what-are-spf-dkim-and-dmarc-and-do-i-need-to-configure-them) to authenticate your emails and improve inbox placement.
- **Continuous monitoring:** Lovable alerts you if DNS changes could impact email delivery.

## [​](https://docs.lovable.dev/features/custom-emails\#prerequisites)  Prerequisites

To use custom emails:

- [Lovable Cloud](https://docs.lovable.dev/integrations/cloud) must be enabled for your project.
- Your workspace must be on a paid plan.
- You must own a domain and have access to manage its DNS settings.
- You must be a workspace admin or owner to add, delete, or verify domains.

## [​](https://docs.lovable.dev/features/custom-emails\#how-custom-emails-work)  How custom emails work

When you configure an email domain, Lovable:

- Creates a transactional sender subdomain under your root domain, such as `notify.yourdomain.com`
- Guides you through DNS configuration using an automated setup flow
- Verifies your domain by checking required DNS records
- Automatically generates branded authentication email templates
- Deploys an auth email hook that routes authentication emails through your email domain
- Activates email delivery once DNS verification completes

After verification, authentication emails are sent from your domain instead of the default Lovable Cloud Auth sender.

### [​](https://docs.lovable.dev/features/custom-emails\#email-domain-scope-and-usage)  Email domain scope and usage

Email domains are provisioned at the workspace level.

- A workspace can have multiple email domains
- A verified domain can be used across multiple projects
- Each project selects which verified domain it uses
- Only one email domain can be active per project at a time
- Only domains with status **Verified** can send emails
- Custom emails can be enabled or disabled per project

If custom emails are disabled for a project, authentication emails fall back to the default Lovable Cloud Auth sender.

## [​](https://docs.lovable.dev/features/custom-emails\#add-an-email-domain)  Add an email domain

Select the domain you want to use for sending emails. This will be the domain your users see in their inbox.There are two ways to start:

- **From the chat**: Ask Lovable to set up custom emails and it will present a setup button. For example:






Copy







Ask AI











```
I want to send password reset emails from my domain.
```

- **From Cloud settings** : Go to **Cloud → Email** and click **Get started**.  This takes you to the custom email setup flow.

1

[Navigate to header](https://docs.lovable.dev/features/custom-emails#)

Set an email domain

- Choose an existing workspace domain from the dropdown, or select **Add a new email domain**, then enter your root domain or subdomain, for example `yourdomain.com`.






Domains can have up to 5 levels, for example `a.b.c.example.com`.

- Click **Continue**.

2

[Navigate to header](https://docs.lovable.dev/features/custom-emails#)

Configure the sender subdomain

Configure the subdomain prefix that will be used for sending authentication emails. The right-side preview shows a simulated inbox with example emails from your configured domain.

- By default, Lovable creates a  `notify` subdomain for delivery, for example `noreply@notify.yourdomain.com`, but you can change the subdomain.
- Optionally, you can enable **Show as sent from @yourdomain.com** so recipients see emails from `@yourdomain.com` in their inbox, while your transactional subdomain handles delivery behind the scenes.
- Click **Set up domain**.

3

[Navigate to header](https://docs.lovable.dev/features/custom-emails#)

Complete DNS configuration

After clicking **Set up domain**, Lovable launches an **automated DNS configuration flow** (powered by Entri) that guides you through setting up the required `NS` zone delegation for your domain. If your DNS provider is not listed or you prefer manual control, you can configure DNS records yourself. Scroll to the bottom of the **Select your domain provider** Entri modal and choose **Go to our manual setup**.Both the automated and manual method require verifying ownership of your domain. Lovable will provision your domain and generate the required DNS records.

- Automatic setup

- Manual setup


Follow the on-screen prompts to log in to your DNS provider and authorize Entri to update your DNS records.

1. Copy the displayed DNS records.
   - `TXT` record for domain verification
   - `NS` records pointing to Lovable’s nameservers
2. Track your progress with the **I have copied X/Y records** counter.
3. Input the copied DNS records directly into your domain registrar or DNS provider.

You can also forward these instructions to a colleague if someone else manages your DNS.

4

[Navigate to header](https://docs.lovable.dev/features/custom-emails#)

Wait for verification

After DNS is configured, you’re taken back to the **Custom emails** page in your project.A status banner shows the current state of your domain.

DNS changes typically propagate within a few hours, but may take up to 48 hours.

While DNS verification is in progress, Lovable immediately generates and deploys your authentication email templates.An automated prompt appears in chat and is executed in the background:

Copy

Ask AI

```
Set up Lovable auth email templates for notify.yourdomain.com. DNS verification is in progress. Match the email templates to my app's style: use my brand colors, add my logo if I have one, and write the copy in the same tone and language as my app.
```

Lovable automatically generates and deploys six branded authentication email templates:

- Applies your app’s brand colors
- Adds your logo if one exists in the project
- Matches tone and language used in your app

You can review and [customize the email templates](https://docs.lovable.dev/features/custom-emails#customizing-email-templates) even before DNS verification completes.

Lovable automatically detects when DNS verification completes and activates your domain.Once the domain status changes to **Verified**, authentication emails begin sending from your domain instead of the default Lovable Cloud Auth sender.Until verification is complete, authentication emails continue sending using the default sender.

Newly provisioned domains start with a neutral reputation. Initial deliverability may fluctuate while your domain builds trust with inbox providers through consistent, legitimate sending. See [Email deliverability best practices](https://docs.lovable.dev/features/custom-emails#email-deliverability-best-practices) for more information.

## [​](https://docs.lovable.dev/features/custom-emails\#email-domain-statuses)  Email domain statuses

Email domains can move through the following statuses:

| Status | Meaning |
| --- | --- |
| **Pending** | Setup has started and DNS configuration is in progress |
| **Verifying** | DNS records have been detected and verification is in progress |
| **Setting up** | Domain provisioning in progress |
| **Verified (Active)** | Domain is ready and can be used to send emails |
| **Offline** | Required DNS records were changed or removed after verification |
| **Failed** | Verification or provisioning failed |

Domains are continuously monitored. If required DNS records drift, are removed, or expire, the domain may move to an inactive state until re-verified.

## [​](https://docs.lovable.dev/features/custom-emails\#managing-email-domains)  Managing email domains

In **Cloud → Custom emails**, use the domain dropdown to access:

- **Analytics and logs**: View delivery metrics for the email domain and email activity for the current project using that domain.
- **Manage domains**: View all workspace email domains and their status badges, inspect and copy DNS records, switch which domain the current project uses, manually verify a domain, add a domain, or delete a domain.






Deleting a domain is a **workspace-wide action**. This will stop sending emails from that domain. Any project using that domain will automatically fall back to default authentication emails.

- **Add a new domain:** Add a new workspace email domain.
- **Disable custom emails**: Enable or disable custom emails for the current project. When disabled, authentication emails are sent using the default Cloud Auth sender instead of your custom templates.

### [​](https://docs.lovable.dev/features/custom-emails\#analytics-and-logs)  Analytics and logs

The analytics view includes:

- **Metrics cards**: Sent, delivered, bounced counts for the email domain
- **Delivery chart**: Delivered vs. failed emails for the email domain over 7, 30, or 90 days
- **Email activity log**: An expandable list of individual emails sent for the current project, showing recipient, status (completed, failed, pending), type (auth email or test email), timestamps, and detailed execution traces with error messages for failures

## [​](https://docs.lovable.dev/features/custom-emails\#customize-authentication-email-templates)  Customize authentication email templates

When custom emails are enabled, Lovable automatically generates branded authentication email templates for your project.The **Custom emails** page includes a tab for each template. Each tab shows:

- **From** address
- **Subject** line
- **Live preview** of the email template rendered in an iframe
- **Send test** options, including send a test email to your account or to a custom address.






Emails sent from newly configured domains may initially land in spam while reputation builds.


### [​](https://docs.lovable.dev/features/custom-emails\#automatic-branding)  Automatic branding

Lovable applies your app’s branding automatically by:

- Extracting CSS variables from `src/index.css` (primary colors, fonts, border radius)
- Detecting logo files in `public/` and `src/assets/`
- Uploading a detected logo to a dedicated email assets storage bucket
- Adapting email copy to match your app’s tone and language

The outer email body background is always `#ffffff` to ensure consistent rendering across email clients. Inner components can use your brand colors.

### [​](https://docs.lovable.dev/features/custom-emails\#what-you-can-customize)  What you can customize

You can ask Lovable to update:

- Copy and tone
- Brand colors
- Layout and structure
- Images and logo placement
- Subject lines

The outer email body background must remain white (`#ffffff`) to ensure consistent rendering across email clients. Inner components can use your brand colors.

For example:

Copy

Ask AI

```
Match the emails to my brand by using #2563eb for buttons and headings, add my logo at the top, remove emojis, make the tone professional but friendly, move the button higher in the layout, add a footer with support@myapp.com, and update subject lines to start with my app name.
```

Lovable updates templates while preserving required authentication variables and secure callback links.

### [​](https://docs.lovable.dev/features/custom-emails\#edit-templates-manually)  Edit templates manually

If you prefer to edit code directly:

- Authentication templates are located at `supabase/functions/_shared/email-templates/`
- The sending logic is located at `supabase/functions/auth-email-hook/`

Templates use React Email components with inline styles (email clients do not support external CSS).Required authentication variables and callback links must remain intact, or authentication flows will break.After editing template files or subject lines, you must ask Lovable to redeploy the `auth-email-hook` function for changes to take effect. Redeployment updates the backend function that renders and sends your authentication emails.For example:

Copy

Ask AI

```
Redeploy my email templates
```

## [​](https://docs.lovable.dev/features/custom-emails\#email-deliverability-best-practices)  Email deliverability best practices

When sending authentication emails from a new domain, inbox placement may take time to stabilize. Inbox providers evaluate sender reputation over time based on engagement, authentication, and sending patterns.Follow these practices to improve deliverability and build a strong sender reputation.

Warm up new domains gradually

New email domains have no sending history. Inbox providers treat them cautiously because spammers often use fresh domains and abandon them quickly.Initial deliverability may fluctuate during the first few days or weeks. This is normal.Your domain’s reputation builds gradually as real users engage with authentication emails such as signups and password resets.Using a dedicated transactional subdomain helps isolate authentication traffic and protect your primary domain reputation.**Typical timeline**

- First few days: Test emails may land in spam
- First few weeks: Deliverability improves as legitimate traffic builds reputation
- First few months: Reputation stabilizes with consistent, engaged sending

**What helps:**

- Start sending with normal authentication traffic (user signups, password resets)
- Let volume grow naturally as your user base expands
- Maintain consistent sending patterns over weeks and months
- Ensure authentication emails are expected and triggered by real user actions
- Mark legitimate emails as “Not spam” in your inbox

**What hurts:**

- Sudden large spikes in email volume from a brand-new domain
- Sending bulk test emails immediately after setup
- Inconsistent sending (long gaps followed by sudden bursts)
- Panic-driven changes to domains or sender identity

Reputation builds automatically with consistent, legitimate sending behavior over time.

Ensure domain authentication is valid

Authentication must pass for emails to reach the inbox. Lovable automatically configures `SPF`, `DKIM`, and `DMARC` when you set up your email domain.If DNS records are modified or misconfigured, authentication can fail and emails may land in spam.Always confirm the domain status is **Verified** in **Cloud → Email**.

Send only legitimate, user-triggered emails

Authentication emails should only be triggered by real user actions, such as signing up or resetting a password.Avoid generating artificial traffic for testing or automation purposes. Unnatural traffic patterns can negatively affect domain reputation.

Keep authentication emails strictly transactional

Authentication emails should clearly match the user’s recent action and explain why the email was sent.**Good practices**:

- Use straightforward subject lines (“Reset your password”, “Verify your email”)
- Clearly explain what the user needs to do
- Match the email to the action the user took

**Avoid**:

- Adding marketing content or upsells to auth emails
- Misleading or clickbait subject lines
- Promotional language in authentication emails

Maintain consistent sender identity

Use a consistent:

- From address
- Sender name
- Domain

Frequent changes to sender identity reduce trust signals with inbox providers.

Avoid spam-trigger formatting

When customizing email templates:**Do**:

- Use clear, descriptive subject lines
- Keep formatting simple and clean
- Use a balanced text-to-image ratio
- Include your brand name and a recognizable sender address
- Ensure links in the email match your sending domain whenever possible

**Don’t**:

- Use ALL CAPS in subject lines
- Add excessive punctuation (!!!)
- Create misleading subject lines
- Use image-heavy layouts
- Link to unrelated or mismatched domains

Inbox providers look for consistency between the sender domain and the domains used in links. If your email is sent from `yourdomain.com`, links inside the email should ideally point to `yourdomain.com` or its subdomains. Mismatched domains are commonly used in phishing attacks and may trigger spam filtering.Clear, predictable formatting and domain alignment improve trust and engagement.

Monitor bounce rates and complaints

High bounce rates damage sender reputation.Use **Analytics and logs** to monitor:

- Sent
- Delivered
- Bounced

Hard bounces caused by invalid or mistyped addresses are especially harmful. Repeatedly sending to invalid addresses can reduce inbox placement.If bounce rates increase:

- Review how email addresses are collected
- Validate inputs at signup
- Avoid retrying failed deliveries repeatedly

Spam complaints also negatively affect reputation. Authentication emails should always be expected and clearly explained.

Limit internal testing

The **Send test** option in **Cloud → Email** is useful for validation, but limit your testing.**Why this matters**:

- Inbox providers evaluate engagement signals from all emails you send
- Repeated test emails to the same address create artificial traffic patterns
- Bouncing test emails to fake addresses damages your reputation

**Better approach**:

- Send a few test emails to yourself or your team
- Use real email addresses you control
- Avoid sending large batches of test emails

If emails land in spam

If authentication emails are marked as spam:

1. Confirm the domain status is **Verified**
2. Ensure DNS records are correctly configured
3. Review subject lines and content
4. Check bounce rates in **Analytics and logs**
5. Reduce sudden spikes in sending volume
6. Be patient. New domains need time to build trust with inbox providers

Deliverability improves with consistent, legitimate sending behavior over time.

Encourage positive engagement signals

Inbox providers consider engagement when evaluating sender reputation.Authentication emails naturally generate positive signals when users:

- Open the email
- Click the verification or reset link
- Complete the intended action

Clear messaging and expected flows increase engagement and improve long-term inbox placement.

Understanding inbox provider algorithms

Inbox providers don’t share their spam filtering criteria publicly (to prevent spammers from gaming the system). However, they generally evaluate:

- **Sender authentication**: Are `SPF`, `DKIM`, and `DMARC` configured correctly? (Lovable handles this automatically)
- **Sender reputation**: What’s your history of bounces, complaints, and engagement?
- **Content quality**: Are subject lines clear? Is formatting clean? Do links match your domain?
- **Engagement signals**: Do users open emails? Click links? Reply? Or mark them as spam
- **Sending patterns**: Are you sending consistently? Or in sudden bursts?

Think: “What would a phisher do?” Then do the opposite. Inbox providers want to protect their users, so demonstrate at every step that you’re a legitimate sender with no malicious intent.

## [​](https://docs.lovable.dev/features/custom-emails\#troubleshooting)  Troubleshooting

Email domain is stuck in "Verifying"

Possible causes:

- DNS records not fully propagated
- `NS` delegation incorrect
- `TXT` verification record missing
- DNS configured on wrong domain level

**What to do:**

- Recheck the exact DNS records shown in **Cloud → Email**
- Confirm records were added to the correct root domain
- Wait up to 48 hours for propagation
- Retry verification

Domain status shows Offline

This means required DNS records were changed, removed, or expired after verification.**What to do:**

- Review DNS records in **Cloud → Email**
- Restore missing `NS` or `TXT` records
- Re-verify the domain

Emails are not sending

Check:

- Email domain is linked to your project
- Domain status is **Verified**
- Custom emails are enabled for the project
- Cloud Auth is enabled
- You are triggering a supported authentication email type

Use **Send test** on a template tab and check **Analytics and logs** for delivery failures or bounces.

High bounce rates in analytics

Common causes:

- Invalid email addresses
- Typos during signup
- Repeated retries to invalid addresses

Validate email input at signup and avoid retrying hard bounces.

Test emails are landing in spam

This is common for newly provisioned domains.Avoid sending large volumes of internal test emails. Allow organic user-triggered emails to build reputation over time.

My email template changes are not showing

If you edited template files but users are still receiving old versions:

- Ensure the `auth-email-hook` function was redeployed
- Ask Lovable to redeploy your email templates

Template changes only take effect after redeployment.

Use external tools to investigate deliverability issues

If emails are consistently landing in spam or being rejected, you can use the following tools for deeper diagnostics.These tools are optional and most useful for higher-volume senders.

- [Google Postmaster Tools](https://postmaster.google.com/)


View sender reputation, spam rates, and authentication alignment for Gmail recipients.
- [Yahoo Sender Hub](https://senders.yahooinc.com/)


Monitor complaint rates and sender reputation for Yahoo inboxes.
- [Spamhaus blocklist lookup](https://check.spamhaus.org/)


Check whether your domain, IP address, or email URLs appear on major blocklists.
- [Google Safe Browsing](https://transparencyreport.google.com/safe-browsing/search)


Test links used in your emails to ensure they are not flagged as unsafe.

These tools help diagnose reputation or blocklist issues that may impact inbox placement.

## [​](https://docs.lovable.dev/features/custom-emails\#faq)  FAQ

What are custom authentication emails in Lovable?

Custom authentication emails allow your Lovable Cloud app to send account-related emails such as signup confirmations, password resets, magic links, invitations, email change confirmations, and reauthentication codes from your own domain instead of the default Lovable Cloud Auth sender.These emails are triggered automatically by Cloud Auth when users perform security-related actions.

Are authentication emails the same as transactional emails?

Authentication emails are a subset of transactional emails. All authentication emails are transactional, but not all transactional emails are authentication emails.Custom emails support **authentication emails only**.

Can I send marketing emails with custom emails?

No. Custom emails support authentication emails only (signup confirmations, password resets, magic links, invites, email change, and reauthentication).Marketing emails, newsletters, order confirmations, and other non-authentication transactional emails are not supported at the moment.

Do custom emails require Lovable Cloud?

Yes. Custom emails require Lovable Cloud and integrate with Cloud Auth to send authentication emails.

Do I need a custom web domain to use an email domain?

No. Your web custom domain controls where your app is hosted. A custom email domain controls which domain your emails are sent from.These are separate configurations because web hosting and email delivery use different DNS records and infrastructure.You can use a completely different root domain for email sending as long as you control its DNS. However, using a domain that aligns with your product brand is recommended for user trust and deliverability.Hosting your app on a custom domain does not automatically configure email sending.

Can I use a subdomain for email sending?

Yes. Lovable automatically creates a transactional subdomain such as `notify.yourdomain.com` for delivery.You can optionally display emails as coming from your root domain while delivery happens through the subdomain behind the scenes.Using a dedicated email subdomain is recommended because it helps protect your root domain’s reputation.

Do I need an external email provider like SendGrid or Resend?

No. Lovable manages domain verification, DNS configuration, authentication records such as `SPF`, `DKIM`, and `DMARC`, and delivery infrastructure. You do not need to manage API keys or third-party email provider accounts.

What are SPF, DKIM, and DMARC, and do I need to configure them?

`SPF`, `DKIM`, and `DMARC` are email authentication standards that help inbox providers verify that your emails are legitimate and not spoofed.When you send an email, providers such as Gmail or Outlook check that:

- The email is authorized to be sent from your domain
- The message has not been altered in transit
- The domain owner has defined a policy for handling suspicious emails

If authentication fails, emails may be marked as spam, rejected, or damage your domain reputation.Lovable automatically configures and maintains:

- **SPF (Sender Policy Framework):** Authorizes which servers can send email for your domain
- **DKIM (DomainKeys Identified Mail):** Cryptographically signs emails to prevent tampering
- **DMARC (Domain-based Message Authentication, Reporting, and Conformance):** Defines how providers handle failed authentication and protects against spoofing

You do not need to manually configure these records. Lovable sets them up during domain verification and continuously monitors them. If authentication records are modified, removed, or expire, you are notified so they can be restored.

How many authentication emails are included per month?

Each paid workspace includes **50,000 authentication emails per month** at no additional cost.Usage is calculated across the entire workspace.Additional emails are billed at **$1 per 1,000 emails**.

Can I use custom emails on the free plan?

No. Custom emails are available on **paid plans only**. Free plans use the default Lovable Cloud Auth sender.

How long does DNS verification take?

DNS changes typically propagate within a few hours, but can take up to 48 hours.You can check the domain status in **Cloud → Email**. The status updates automatically once verification completes.

Why are my emails going to spam?

New email domains start with no sending reputation.If authentication emails land in spam:• Confirm the domain status is **Verified**

• Ensure DNS records have not changed

• Avoid sudden spikes in sending volume

• Avoid spam-trigger formatting

• Check bounce rates in **Analytics and logs**Deliverability improves over time with consistent, legitimate user activity.

Can I customize the email templates?

Yes. You can customize:

- Copy and tone
- Brand colors
- Layout and structure
- Logos and images
- Subject lines

You can ask Lovable to update the templates or edit them directly in `supabase/functions/_shared/email-templates/`.Required authentication variables and callback links must remain intact.The outer email body background must remain white (`#ffffff`) to ensure consistent rendering across email clients. Inner components can use your brand colors.

What happens if I disable custom emails?

If custom emails are disabled for a project, authentication emails continue sending using the default Lovable Cloud Auth sender instead of your branded templates.

What happens if I delete an email domain?

Deleting an email domain is a **workspace-wide action**.All projects using that domain will immediately fall back to the default Lovable Cloud Auth sender.

Was this page helpful?

YesNo

[Google auth](https://docs.lovable.dev/features/google-auth) [Testing tools](https://docs.lovable.dev/features/testing)

Ctrl+I

Assistant

Responses are generated using AI and may contain mistakes.