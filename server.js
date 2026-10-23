import { openDb } from './src/db.js';
import { createApp } from './src/app.js';

const dbPath = process.env.DB_PATH || 'data/ssg6000.db';
const port = Number(process.env.PORT) || 3780;
const host = '127.0.0.1';

const db = openDb(dbPath);
const app = createApp(db);

app.listen(port, host, () => {
  console.log(`SSG6000 FQC 演示系统已启动: http://${host}:${port}`);
  console.log(`数据库文件: ${dbPath}`);
});
