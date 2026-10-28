import { createApp } from './app.js';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';

async function start() {
  await connectDB();

  const app = createApp();

  app.listen(env.PORT, () => {
    console.log(`[ConnectIndia Gateway] Server active and listening on port ${env.PORT}`);
    // console.log(`[ConnectIndia Gateway] Environment: ${env.NODE_ENV}`);
  });
}

start();
