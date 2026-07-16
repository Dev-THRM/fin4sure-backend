import { sequelize } from './config/db.js';

(async () => {
  const [tables] = await sequelize.query('SHOW TABLES');
  for (let row of tables) {
    const tableName = Object.values(row)[0];
    const [indexes] = await sequelize.query(`SHOW INDEXES FROM \`${tableName}\``);
    const keyNames = [...new Set(indexes.map(i => i.Key_name))];
    for (let key of keyNames) {
      if (key.match(/_\d+$/)) {
        console.log(`Dropping ${key} from ${tableName}...`);
        try {
          await sequelize.query(`ALTER TABLE \`${tableName}\` DROP INDEX \`${key}\``);
        } catch(e) {
          console.log(`Failed to drop ${key}`);
        }
      }
    }
  }
  process.exit(0);
})();
