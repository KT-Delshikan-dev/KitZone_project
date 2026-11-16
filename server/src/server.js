import { env } from './config/env.js';
import { connectDatabase } from './config/database.js';
import app from './app.js';
await connectDatabase(env.MONGODB_URI);
const server=app.listen(env.PORT,()=>console.info(`KITZONE API listening on ${env.PORT}`));
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>server.close(()=>process.exit(0)));
