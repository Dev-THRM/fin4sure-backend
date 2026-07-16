import { sequelize } from './config/db.js';
(async () => {
  const [tables] = await sequelize.query('SHOW TABLES');
  for (let row of tables) {
    const tableName = Object.values(row)[0];
    const [indexes] = await sequelize.query(`SHOW INDEXES FROM \`${tableName}\``);
    if (indexes.length > 50) {
      console.log(`${tableName} has ${indexes.length} keys`);
    }
  }
  process.exit(0);
})();
