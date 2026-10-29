import { createApp } from './app.js';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';

async function start() {
  await connectDB();

  const app = createApp();
  const PORT = process.env.PORT || env.PORT || 5000;

  app.listen(PORT, () => {
    console.log(
      `[ConnectIndia Gateway] Server active and listening on port ${PORT}`
    );
  });
}

start();
