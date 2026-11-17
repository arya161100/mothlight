// MOTHLIGHT — serve.ts
// A tiny static server for game/ (Node 22, standard library only) so the
// entry can be played locally without a build step:
//
//   node serve.ts            # serves game/ on http://localhost:8080
//   node serve.ts --port 8000
//
// It sends the MIME types a browser game needs, refuses any path that
// escapes game/, and otherwise does nothing clever: a development
// convenience, not a web server for the internet.

import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('./game', import.meta.url)));

const args = process.argv.slice(2);
const portIndex = args.indexOf('--port');
const requested = portIndex === -1 ? 8080 : Number(args[portIndex + 1]);
const port =
  Number.isInteger(requested) && requested > 0 && requested < 65536 ? requested : 8080;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

const server = createServer((req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    let rel = decodeURIComponent(url.pathname);
    if (rel === '/') rel = '/index.html';
    const file = resolve(join(root, normalize(rel)));
    if (!file.startsWith(root + sep) && file !== root) {
      res.writeHead(403);
      res.end('forbidden');
      return;
    }
    const stat = statSync(file);
    if (!stat.isFile()) {
      res.writeHead(404);
      res.end('not found');
      return;
    }
    res.writeHead(200, {
      'content-type': MIME[extname(file).toLowerCase()] || 'application/octet-stream',
      'content-length': stat.size,
    });
    createReadStream(file).pipe(res);
  } catch (e) {
    res.writeHead(404);
    res.end('not found');
  }
});

server.on('error', (err) => {
  console.error(`MOTHLIGHT could not listen on port ${port}: ${err.message}`);
  process.exit(1);
});

server.listen(port, () => {
  console.log(`MOTHLIGHT served at http://localhost:${port} (game/)`);
});
