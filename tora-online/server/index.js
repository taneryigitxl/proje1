import { createApp } from './app.js';

const app = await createApp();
const address = await app.listen();
console.log(`Tora game server port ${address.port} üzerinde hazır.`);
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { void app.close().then(() => process.exit(0)); });
