# Portfolio chat backend

A small Cloudflare Worker that sits between your portfolio's chat box and the Anthropic API. It keeps your API key secret, limits abuse, remembers questions the bot couldn't answer, and lets you teach it answers from a private admin page.

You only do this setup once. It takes about 20 minutes.

## What you need

- A computer with [Node.js](https://nodejs.org) installed (the LTS version is fine).
- A free Cloudflare account.
- An Anthropic API key.

You create the accounts and the key yourself. Never paste the key into a chat, an email or any file in this repo.

## Step 1: Create the accounts

1. Sign up at [cloudflare.com](https://dash.cloudflare.com/sign-up). The free plan is enough.
2. Sign up at [console.anthropic.com](https://console.anthropic.com), add a payment method, and go to **API keys** to create a key. Copy it somewhere safe for the next 10 minutes. It starts with `sk-ant-`.
3. **Set a monthly spend limit** in the Anthropic console (Settings, then Limits). Do this now, before anything is live. A small limit, such as a few dollars, means the worst case is capped.

## Step 2: Install the tools

Open Terminal (Mac) or PowerShell (Windows) and run:

```
npm i -g wrangler
wrangler login
```

`wrangler login` opens your browser. Click Allow.

## Step 3: Create the storage

In Terminal, go into this folder:

```
cd path/to/portfolio/chat-worker
wrangler kv namespace create CHAT_KV
```

It prints a block that includes a line like `id = "abc123..."`. Open `wrangler.toml` and replace `REPLACE_WITH_YOUR_KV_NAMESPACE_ID` with that id. Keep the quotes.

## Step 4: Add your two secrets

```
wrangler secret put ANTHROPIC_API_KEY
wrangler secret put ADMIN_TOKEN
```

Each command asks you to paste a value.

- `ANTHROPIC_API_KEY`: the key from Step 1.
- `ADMIN_TOKEN`: a long password you make up (20+ random characters). You will type it into the admin page. A password manager can generate one.

The values are stored by Cloudflare. They are not written to any file.

## Step 5: Deploy

```
wrangler deploy
```

At the end it prints your Worker URL, something like `https://azhar-portfolio-chat.your-name.workers.dev`. Copy it.

## Step 6: Connect the website

1. Open `chat.js` in the repo root and set the constant at the top:
   ```js
   const WORKER_URL = "https://azhar-portfolio-chat.your-name.workers.dev";
   ```
2. Commit and push, so GitHub Pages publishes it. The bot reads its knowledge from `chat-kb.json` on your site, so that file must be published too.
3. Open `https://blackhellcan.github.io/portfolio/admin.html`, paste the same Worker URL and your admin token, and click Save. This page is private by obscurity: it is not linked anywhere and tells search engines to ignore it. The token is what actually protects it. Don't share the token.

## Day to day

- **Unanswered questions** tab: when the bot doesn't know something, the question lands here. Type your answer and click **Teach**. The bot uses it from the next message on. **Dismiss** removes questions you don't want to answer.
- **What the bot has learned** tab: everything you've taught it. Delete anything outdated.
- **Visitors** tab: who chatted (name, company, email if given), when, and how many messages. Click one to read the transcript.
- To change what the bot knows in general, edit `chat-kb.json` (its `pages` list tells the bot which portfolio page to link to). Changes appear within about 10 minutes of publishing.

Records are kept for 90 days.

## How the bot picks a model

Two models are used, set in `wrangler.toml` as `MODEL_SMALL` (Haiku) and `MODEL_MID` (Sonnet).

- Every message starts on the small, cheap model.
- Longer or harder questions go straight to the mid model: more than 220 characters, two or more question marks, words like "walk me through", "compare", "trade-off" or "step by step", or two case studies named in one message.
- If the small model says it doesn't know, or its call fails, the same question is retried once on the mid model. The bot never goes beyond that.
- Only if the mid model also doesn't know does the question appear under **Unanswered questions**.

When the mid model is used it also "thinks" first (Claude's extended thinking) before answering, which gives better answers on case-study walkthroughs and comparisons. Thinking tokens are billed like output tokens, so it only runs on the mid model. The budget is `THINKING_BUDGET` in `wrangler.toml` (default 1024 tokens; set `"0"` to turn thinking off). The thinking text is never shown or stored.

Most visitor questions are simple, so most replies cost the small-model price, and the pricier model is only paid for when it is needed. Each logged reply records which model answered, and the admin transcripts show it.

## Optional: email me new conversations

The Worker can email you an hourly digest of new chats (nothing is sent in hours with no new chats). Skip this if you'd rather use the admin page.

1. Create a free account at [resend.com](https://resend.com) and make an API key.
2. In this folder run `wrangler secret put RESEND_API_KEY` and paste the key.
3. In `wrangler.toml`, remove the `#` before the `NOTIFY_EMAIL` line and set it to your address, for example `NOTIFY_EMAIL = "mazhar.shaikh91@outlook.in"`. This must be the email you signed up to Resend with: the free test sender (`onboarding@resend.dev`) can only email the account owner, which is fine here.
4. Run `wrangler deploy`.

If either setting is missing, the digest is skipped silently. To read everything at any time, open the **Visitors** tab and use **Download all logs**.

## What it costs

- Cloudflare's free plan covers a portfolio's traffic.
- The Anthropic API (Haiku, with Sonnet for harder questions) is billed per token, meaning per amount of text sent and received. A short chat is a very small fraction of a cent to a few cents, but the exact rate changes. Check current pricing at [anthropic.com/pricing](https://www.anthropic.com/pricing) and watch usage in the console.
- Built-in limits: 40 messages per visitor IP per hour, 60 messages per conversation, replies capped at 500 tokens, and only the last 12 messages are sent each time.
- Your monthly spend limit from Step 1 is the hard backstop.

## If something goes wrong

- **Chat says it's unavailable:** run `wrangler tail` in this folder to watch live logs while you send a message. Common causes are an empty or wrong `ANTHROPIC_API_KEY`, no credit in the Anthropic account, or `chat-kb.json` not being published.
- **Admin page says Unauthorized:** the token differs from the one you set. Run `wrangler secret put ADMIN_TOKEN` again and use the new value.
- **Browser blocks the request (CORS):** the site must be served from `https://blackhellcan.github.io`. For local testing, `http://localhost` and `http://127.0.0.1` also work.
- After editing `wrangler.toml` or `worker.js`, run `wrangler deploy` again.
- To rotate the API key, create a new one in the console, run `wrangler secret put ANTHROPIC_API_KEY`, then delete the old one.
