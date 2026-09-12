import { app } from './app.js';
import { env } from './config/env.js';
import { connectDatabase } from './lib/mongoose.js';

await connectDatabase();
app.listen(env.PORT, () => console.log(`Placement Portal API listening on port ${env.PORT}`));
