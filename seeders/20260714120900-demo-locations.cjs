'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Insert State
    await queryInterface.bulkInsert('States', [{
      name: 'Maharashtra',
      country: 'India',
      createdAt: new Date(),
      updatedAt: new Date()
    }]);
    
    // Fetch State ID
    const [states] = await queryInterface.sequelize.query(`SELECT id FROM States WHERE name = 'Maharashtra' LIMIT 1;`);
    if (states.length === 0) return;
    const stateId = states[0].id;

    // 2. Insert District
    await queryInterface.bulkInsert('Districts', [{
      name: 'Mumbai City',
      state_id: stateId,
      createdAt: new Date(),
      updatedAt: new Date()
    }]);

    // Fetch District ID
    const [districts] = await queryInterface.sequelize.query(`SELECT id FROM Districts WHERE name = 'Mumbai City' LIMIT 1;`);
    if (districts.length === 0) return;
    const districtId = districts[0].id;

    // 3. Insert City
    await queryInterface.bulkInsert('Cities', [{
      name: 'Mumbai',
      district_id: districtId,
      createdAt: new Date(),
      updatedAt: new Date()
    }]);

    // Fetch City ID
    const [cities] = await queryInterface.sequelize.query(`SELECT id FROM Cities WHERE name = 'Mumbai' LIMIT 1;`);
    if (cities.length === 0) return;
    const cityId = cities[0].id;

    // 4. Insert Pincodes
    await queryInterface.bulkInsert('Pincodes', [
      { code: '400001', city_id: cityId, createdAt: new Date(), updatedAt: new Date() },
      { code: '400002', city_id: cityId, createdAt: new Date(), updatedAt: new Date() },
      { code: '400053', city_id: cityId, createdAt: new Date(), updatedAt: new Date() }
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Pincodes', null, {});
    await queryInterface.bulkDelete('Cities', null, {});
    await queryInterface.bulkDelete('Districts', null, {});
    await queryInterface.bulkDelete('States', null, {});
  }
};
