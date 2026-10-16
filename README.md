# Byte Harvest 🌱

A cozy farm game for reviewing the **PhilNITS / ITPEC FE exam (Sun Oct 25, 2026)**.

- **Fish at the pond** for Subject A past-paper questions, and **dig in the mine** for Subject B.
- **Every miss becomes a seed.** Water it on later days (+1 day, then +2) until it is ready to harvest.
- **Golden crops** (sure but wrong) come first. **Pests** (K/C/N/M/T) tag why you missed.
- The **almanac** follows the Oct 16–25 plan. In the **House**, sleep copies the diary for the reviewer chat.

Play: https://zendrix-hub.github.io/-byte-harvest/. On Android, open it in Chrome, then tap ⋮ → **Install app**. Open it once while online, then go to House → **Download all questions** to play offline.

## Develop

    npm install
    npm run dev        # http://localhost:5173/-byte-harvest/
    npm test           # unit + component tests
    npm run e2e        # Playwright: 360×800 phone + 1366×768 PC
    npm run build && npm run budget && npm run check:pwa

Question images and keys come from ITPEC's publicly released FE past papers (2025S, 2025A, 2026S) and are used here for personal study.
