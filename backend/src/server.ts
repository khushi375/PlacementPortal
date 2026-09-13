
import dns from 'node:dns';

dns.setServers(['1.1.1.1', '8.8.8.8']);
import { app } from './app.js';
import { env } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './lib/mongoose.js';

await connectDatabase();
const server = app.listen(env.PORT, () => console.log(`Placement Portal API listening on port ${env.PORT}`));

async function shutdown() {
  server.close();
  await disconnectDatabase();
  process.exit(0);
}

process.on('SIGTERM', () => { void shutdown(); });
process.on('SIGINT', () => { void shutdown(); });
