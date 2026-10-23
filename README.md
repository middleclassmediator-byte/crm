# Calling CRM (React + Vite + Google Sheets)

Store customers, group them under your own subtitles (Housing, Flat, anything), and log every call or
WhatsApp contact with date, time, remark and an optional voice message.

## 1. Backend (Google Sheet + Apps Script)
1. Create a new Google Sheet.
2. Extensions > Apps Script. Delete the sample code and paste everything from `backend/Code.gs`.
3. Change `SECRET = 'change-me'` to your own secret word.
4. Select the `setup` function and click Run. Approve the permissions (Sheets + Drive). This creates the
   `Categories`, `Customers` and `Calls` tabs.
5. Deploy > New deployment > type **Web app**. Execute as: **Me**. Who has access: **Anyone**. Deploy.
6. Copy the **Web app URL** (ends with `/exec`).

If you edit `Code.gs` later: Deploy > Manage deployments > edit > Version: New version > Deploy.

## 2. Frontend
```
npm install
npm run dev
```
Open the app, paste the Web app URL and your secret key on the setup screen. Add the optional country
code (for example `91`) so 10-digit numbers open correctly in WhatsApp.

Optional: copy `.env.example` to `.env` to preconfigure the URL and key.

Build for hosting: `npm run build` (output in `dist/`, works on Netlify, Vercel, GitHub Pages, etc.).

## Notes
- Voice messages are recorded in the browser and saved to a Drive folder named
  "Calling CRM Voice Messages". Microphone needs `localhost` or `https`.
- Deleting a subtitle keeps its customers and moves them to Uncategorized.
- The secret key is a light protection only. Do not store highly sensitive data.
