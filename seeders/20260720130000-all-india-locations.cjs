'use strict';
const fs = require('fs');
const path = require('path');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Prevent duplicate seeding if run multiple times
    const [[{ count }]] = await queryInterface.sequelize.query(`SELECT COUNT(*) as count FROM Pincodes;`);
    if (count > 0) {
      console.log('[Seeder] Pincodes already seeded, skipping all-india locations.');
      return;
    }

    const dataPath = path.join(__dirname, 'data', 'pincode_db.json');
    if (!fs.existsSync(dataPath)) {
      console.warn('[Seeder] pincode_db.json not found, skipping all-india seeding.');
      return;
    }

    console.log('[Seeder] Reading pincode database...');
    const rawData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    
    // We only need unique states, districts, cities, and pincodes
    console.log('[Seeder] Extracting unique locations...');
    const stateSet = new Set();
    const districtMap = new Map(); // "stateName_districtName" -> { state, district }
    const cityMap = new Map();     // "stateName_districtName_cityName" -> { state, district, city }
    
    // Pincode to unique city mapping. A pincode might appear multiple times for different offices/villages.
    // We just take the first occurrence of a pincode for its canonical city mapping to avoid duplicates.
    const pincodeMap = new Map(); // "pincode" -> "stateName_districtName_cityName"

    for (const row of rawData) {
      if (!row.state || !row.district || !row.city || !row.pincode) continue;
      
      const st = row.state.trim().toUpperCase();
      const dist = row.district.trim().toUpperCase();
      const cit = row.city.trim().toUpperCase();
      const pin = row.pincode.trim();

      const distKey = `${st}_${dist}`;
      const citKey = `${st}_${dist}_${cit}`;

      stateSet.add(st);
      
      if (!districtMap.has(distKey)) {
        districtMap.set(distKey, { state: st, district: dist });
      }

      if (!cityMap.has(citKey)) {
        cityMap.set(citKey, { state: st, district: dist, city: cit });
      }

      if (!pincodeMap.has(pin)) {
        pincodeMap.set(pin, citKey);
      }
    }

    const now = new Date();

    // ─── 1. STATES ───
    console.log(`[Seeder] Inserting ${stateSet.size} States...`);
    const statesToInsert = Array.from(stateSet).map(s => ({
      name: s,
      country: 'India',
      createdAt: now,
      updatedAt: now
    }));
    
    // Insert in chunks of 5000 (though there are only ~36 states)
    if (statesToInsert.length > 0) {
      await queryInterface.bulkInsert('States', statesToInsert);
    }

    // Fetch inserted states to map name -> id
    const [dbStates] = await queryInterface.sequelize.query(`SELECT id, name FROM States;`);
    const stateNameToId = {};
    for (const s of dbStates) {
      stateNameToId[s.name.toUpperCase()] = s.id;
    }

    // ─── 2. DISTRICTS ───
    console.log(`[Seeder] Inserting ${districtMap.size} Districts...`);
    const districtsToInsert = [];
    for (const [key, val] of districtMap.entries()) {
      const sId = stateNameToId[val.state];
      if (sId) {
        districtsToInsert.push({
          name: val.district,
          state_id: sId,
          createdAt: now,
          updatedAt: now
        });
      }
    }
    
    await insertInChunks(queryInterface, 'Districts', districtsToInsert, 5000);

    // Fetch inserted districts to map "stateId_districtName" -> id
    const [dbDistricts] = await queryInterface.sequelize.query(`SELECT id, name, state_id FROM Districts;`);
    const districtKeyToId = {}; // stateId_districtName -> id
    for (const d of dbDistricts) {
      districtKeyToId[`${d.state_id}_${d.name.toUpperCase()}`] = d.id;
    }

    // ─── 3. CITIES ───
    console.log(`[Seeder] Inserting ${cityMap.size} Cities...`);
    const citiesToInsert = [];
    for (const [key, val] of cityMap.entries()) {
      const sId = stateNameToId[val.state];
      if (sId) {
        const dId = districtKeyToId[`${sId}_${val.district}`];
        if (dId) {
          citiesToInsert.push({
            name: val.city,
            district_id: dId,
            createdAt: now,
            updatedAt: now
          });
        }
      }
    }

    await insertInChunks(queryInterface, 'Cities', citiesToInsert, 5000);

    // Fetch inserted cities to map "districtId_cityName" -> id
    const [dbCities] = await queryInterface.sequelize.query(`SELECT id, name, district_id FROM Cities;`);
    const cityKeyToId = {}; // districtId_cityName -> id
    for (const c of dbCities) {
      cityKeyToId[`${c.district_id}_${c.name.toUpperCase()}`] = c.id;
    }

    // ─── 4. PINCODES ───
    console.log(`[Seeder] Mapping and inserting ${pincodeMap.size} Pincodes...`);
    const pincodesToInsert = [];
    for (const [pin, citKey] of pincodeMap.entries()) {
      const val = cityMap.get(citKey);
      if (val) {
        const sId = stateNameToId[val.state];
        if (sId) {
          const dId = districtKeyToId[`${sId}_${val.district}`];
          if (dId) {
            const cId = cityKeyToId[`${dId}_${val.city}`];
            if (cId) {
              pincodesToInsert.push({
                code: pin,
                city_id: cId,
                createdAt: now,
                updatedAt: now
              });
            }
          }
        }
      }
    }

    console.log(`[Seeder] Bulk inserting ${pincodesToInsert.length} final unique Pincodes in chunks...`);
    await insertInChunks(queryInterface, 'Pincodes', pincodesToInsert, 3000);

    console.log('[Seeder] All India Locations successfully seeded!');
  },

  async down(queryInterface, Sequelize) {
    console.log('[Seeder] Removing all locations...');
    await queryInterface.bulkDelete('Pincodes', null, {});
    await queryInterface.bulkDelete('Cities', null, {});
    await queryInterface.bulkDelete('Districts', null, {});
    await queryInterface.bulkDelete('States', null, {});
  }
};

/**
 * Helper function to insert large arrays in chunks to avoid max packet size issues
 */
async function insertInChunks(queryInterface, tableName, dataArray, chunkSize) {
  for (let i = 0; i < dataArray.length; i += chunkSize) {
    const chunk = dataArray.slice(i, i + chunkSize);
    await queryInterface.bulkInsert(tableName, chunk);
  }
}
