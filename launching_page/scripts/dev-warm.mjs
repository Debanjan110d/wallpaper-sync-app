import { spawn } from "node:child_process";
import http from "node:http";

const DEFAULT_PORT = 3000;

function parsePortFromArgs() {
  const idxP = process.argv.indexOf("-p");
  if (idxP !== -1 && process.argv[idxP + 1]) return Number(process.argv[idxP + 1]);

  const idxPort = process.argv.indexOf("--port");
  if (idxPort !== -1 && process.argv[idxPort + 1]) return Number(process.argv[idxPort + 1]);

  const envPort = process.env.PORT ? Number(process.env.PORT) : undefined;
  if (envPort && Number.isFinite(envPort)) return envPort;

  return DEFAULT_PORT;
}

function warmOnce(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      // Drain to finish the request cleanly.
      res.on("data", () => undefined);
      res.on("end", () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 400) resolve();
        else reject(new Error(`Warmup failed (${res.statusCode})`));
      });
    });

    req.on("error", reject);
    req.setTimeout(10_000, () => {
      req.destroy(new Error("Warmup timeout"));
    });
  });
}

async function warmWithRetry(url, timeoutMs = 30_000) {
  const start = Date.now();
  let lastErr = null;

  while (Date.now() - start < timeoutMs) {
    try {
      await warmOnce(url);
      return;
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  throw lastErr ?? new Error("Warmup failed");
}

async function main() {
  const port = parsePortFromArgs();

  const nextArgs = ["dev", "-p", String(port)];

  const child = spawn("next", nextArgs, {
    stdio: ["inherit", "pipe", "pipe"],
    env: process.env,
    shell: process.platform === "win32", // allow resolving `next` on Windows
  });

  child.stderr.pipe(process.stderr);

  let warmed = false;
  let buffer = "";

  child.stdout.on("data", async (chunk) => {
    const text = chunk.toString("utf8");
    process.stdout.write(text);
    if (warmed) return;

    buffer += text;
    // Next prints: "✓ Ready in ..." when server is ready.
    if (buffer.includes("Ready in")) {
      warmed = true;
      const url = `http://localhost:${port}/`;
      try {
        await warmWithRetry(url);
        process.stdout.write(`\n[warm] Prefetched ${url} (prevents early /_next 404s)\n\n`);
      } catch (e) {
        process.stdout.write(`\n[warm] Failed to prefetch ${url}: ${e?.message || e}\n\n`);
      }
    }

    // Keep the buffer bounded.
    if (buffer.length > 50_000) buffer = buffer.slice(-10_000);
  });

  const shutdown = () => {
    try {
      child.kill("SIGINT");
    } catch {
      // ignore
    }
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  child.on("exit", (code) => {
    process.exit(code ?? 0);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
