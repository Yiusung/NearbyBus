# 1. Generate stops data
python3 aggregator.py
# → produces stops.json (~1.4MB)

# 2. Set up worker
mkdir bus-eta && cd bus-eta
npx wrangler init

# 3. Place files
#    src/index.js      ← worker script
#    public/index.html ← the HTML above
#    wrangler.toml     ← config above

# 4. Upload stops to KV (if using KV) or place in public/
# Option A: KV
npx wrangler kv namespace create STOPS
npx wrangler kv key put --binding STOPS "stops" --path ./stops.json
# (then update wrangler.toml with the KV binding and worker to serve from KV)

# Option B: Just put stops.json in public/ and serve as static asset
cp stops.json public/api/stops   # worker's [assets] serves it at /api/stops

# 5. Test locally
npx wrangler dev

# 6. Deploy
npx wrangler deploy
