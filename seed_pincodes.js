import fetch from 'node-fetch';
import { sequelize } from './config/db.js';
import State from './models/state.js';
import District from './models/district.js';
import City from './models/city.js';
import Pincode from './models/pincode.js';

async function seed() {
  try {
    console.log("Connecting to the database...");
    await sequelize.authenticate();
    
    console.log("Wiping existing location data to start fresh...");
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0;');
    await sequelize.query('TRUNCATE TABLE Pincodes;');
    await sequelize.query('TRUNCATE TABLE Cities;');
    await sequelize.query('TRUNCATE TABLE Districts;');
    await sequelize.query('TRUNCATE TABLE States;');
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1;');
    console.log("Wipe complete!");

    console.log("Fetching Pincodes data...");
    const res = await fetch('https://raw.githubusercontent.com/mithunsasidharan/India-Pincode-Lookup/master/pincodes.json');
    if (!res.ok) {
      throw new Error(`Failed to fetch data: ${res.statusText}`);
    }
    const data = await res.json();
    console.log(`Fetched ${data.length} records.`);

    // Maps to cache IDs
    const stateMap = new Map();
    const districtMap = new Map();
    const cityMap = new Map();
    const processedPincodes = new Set(); // to keep unique pincodes for autofill purpose

    // Existing data check (optional but good to avoid duplicates)
    console.log("Loading existing states...");
    const existingStates = await State.findAll();
    existingStates.forEach(s => stateMap.set(s.name.toUpperCase(), s.id));

    const existingDistricts = await District.findAll();
    existingDistricts.forEach(d => districtMap.set(`${d.name.toUpperCase()}_${d.state_id}`, d.id));

    const existingCities = await City.findAll();
    existingCities.forEach(c => cityMap.set(`${c.name.toUpperCase()}_${c.district_id}`, c.id));

    const pincodesToInsert = [];

    console.log("Processing records...");
    for (const record of data) {
      if (!record.pincode || processedPincodes.has(record.pincode)) {
        continue; // Skip if no pincode or we already mapped this pincode
      }

      const stateName = record.stateName ? record.stateName.trim().toUpperCase() : "UNKNOWN";
      const districtName = record.districtName ? record.districtName.trim().toUpperCase() : "UNKNOWN";
      const officeName = record.officeName ? record.officeName.trim().toUpperCase() : "UNKNOWN";

      // 1. STATE
      let stateId = stateMap.get(stateName);
      if (!stateId) {
        const newState = await State.create({ name: stateName, country: 'India' });
        stateId = newState.id;
        stateMap.set(stateName, stateId);
      }

      // 2. DISTRICT
      const districtKey = `${districtName}_${stateId}`;
      let districtId = districtMap.get(districtKey);
      if (!districtId) {
        const newDistrict = await District.create({ name: districtName, state_id: stateId });
        districtId = newDistrict.id;
        districtMap.set(districtKey, districtId);
      }

      // 3. CITY
      const cityKey = `${officeName}_${districtId}`;
      let cityId = cityMap.get(cityKey);
      if (!cityId) {
        const newCity = await City.create({ name: officeName, district_id: districtId });
        cityId = newCity.id;
        cityMap.set(cityKey, cityId);
      }

      // 4. PREPARE PINCODE
      pincodesToInsert.push({
        code: String(record.pincode),
        city_id: cityId
      });
      processedPincodes.add(record.pincode);

      if (processedPincodes.size % 1000 === 0) {
        console.log(`Processed ${processedPincodes.size} unique pincodes...`);
      }
    }

    console.log(`Bulk inserting ${pincodesToInsert.length} unique pincodes into database...`);
    // Insert in chunks to avoid memory/query size limits
    const chunkSize = 2000;
    for (let i = 0; i < pincodesToInsert.length; i += chunkSize) {
      const chunk = pincodesToInsert.slice(i, i + chunkSize);
      await Pincode.bulkCreate(chunk, { ignoreDuplicates: true });
      console.log(`Inserted chunk ${i / chunkSize + 1} of ${Math.ceil(pincodesToInsert.length / chunkSize)}`);
    }

    console.log("Seeding complete!");
    process.exit(0);
  } catch (err) {
    console.error("Error during seeding:", err);
    process.exit(1);
  }
}

seed();
