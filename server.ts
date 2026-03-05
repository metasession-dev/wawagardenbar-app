import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { initSocketServer } from './lib/socket-server';
import { connectDB } from './lib/mongodb';

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  // Warm up MongoDB connection before accepting requests (with retry)
  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 5000;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await connectDB();
      console.log('✅ MongoDB connection established');
      break;
    } catch (error) {
      if (attempt < MAX_RETRIES) {
        console.warn(`⚠️ MongoDB warmup attempt ${attempt}/${MAX_RETRIES} failed, retrying in ${RETRY_DELAY_MS / 1000}s...`);
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      } else {
        console.error('⚠️ MongoDB warmup failed after all retries (will retry on first request):', error);
      }
    }
  }

  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Initialize Socket.IO
  try {
    initSocketServer(httpServer);
    console.log('✅ Socket.IO server initialized successfully');
    console.log(`   Path: /api/socket`);
    console.log(`   CORS origin: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}`);
  } catch (error) {
    console.error('❌ Failed to initialize Socket.IO:', error);
  }

  httpServer.once('error', (err) => {
    console.error(err);
    process.exit(1);
  });

  httpServer.listen(port, () => {
    console.log(
      `> Server listening at http://${hostname}:${port} as ${
        dev ? 'development' : process.env.NODE_ENV
      }`
    );
  });
});
