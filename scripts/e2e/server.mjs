// Serves the production build for Playwright behind a small proxy that lets
// a request finish after the browser hangs up. `next start` optimizes images
// through the visitor's own socket; a page closed mid-optimization (the end
// of a short test) leaves that image's cache entry pending, and every later
// request for it hangs. Vercel's optimizer is unaffected, so only tests need
// this.
import { spawn } from "node:child_process";
import http from "node:http";

const port = Number(process.env.PORT || 3100);
const inner = port + 1;
const next = spawn("npx", ["next", "start", "--port", String(inner)], {
  stdio: "inherit",
});
const stop = () => next.kill();
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
process.on("exit", stop);
next.on("exit", (code) => process.exit(code ?? 1));

http
  .createServer((req, res) => {
    const upstream = http.request(
      {
        port: inner,
        path: req.url,
        method: req.method,
        headers: req.headers,
      },
      (response) => {
        // Read the whole response even when the browser is gone, so Next
        // completes (and caches) the work it started.
        if (res.destroyed) return response.resume();
        res.writeHead(response.statusCode ?? 502, response.headers);
        response.pipe(res);
        res.on("close", () => response.resume());
      },
    );
    upstream.on("error", () => {
      if (!res.headersSent) res.writeHead(502);
      res.end();
    });
    req.pipe(upstream);
  })
  .listen(port);
