import State from "../models/state.js";
import District from "../models/district.js";
import City from "../models/city.js";
import Pincode from "../models/pincode.js";
import PlatformSetting from "../models/platform_settings.model.js";
import RelationshipManager from "../models/relationship_manager.model.js";

export const getStates = async (req, res) => {
  try {
    const states = await State.findAll({ order: [['name', 'ASC']] });
    res.status(200).json({ success: true, data: states });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getDistricts = async (req, res) => {
  try {
    const { stateId } = req.params;
    const districts = await District.findAll({ where: { state_id: stateId }, order: [['name', 'ASC']] });
    res.status(200).json({ success: true, data: districts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCities = async (req, res) => {
  try {
    const { districtId } = req.params;
    const cities = await City.findAll({ where: { district_id: districtId }, order: [['name', 'ASC']] });
    res.status(200).json({ success: true, data: cities });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllCities = async (req, res) => {
  try {
    const cities = await City.findAll({
      attributes: ['id', 'name'],
      order: [['name', 'ASC']],
      raw: true
    });
    const uniqueCityNames = Array.from(new Set(cities.map(c => c.name).filter(Boolean)));
    return res.status(200).json({ success: true, data: uniqueCityNames });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createOrGetCity = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "City name required" });
    }
    const cleanName = name.trim();
    const [cityObj, created] = await City.findOrCreate({
      where: { name: cleanName },
      defaults: { name: cleanName, district_id: 1 }
    });
    return res.status(200).json({ success: true, city: cityObj, created });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getLocationByPincode = async (req, res) => {
  try {
    const { pincode } = req.params;
    const pincodeRecord = await Pincode.findOne({ where: { code: pincode }, raw: true });

    if (!pincodeRecord) {
      return res.status(200).json({ success: false, data: null, message: 'Pincode not found' });
    }

    const city = await City.findByPk(pincodeRecord.city_id, { raw: true });
    if (!city) {
      return res.status(200).json({ success: false, data: null, message: 'City not found' });
    }

    const district = await District.findByPk(city.district_id, { raw: true });
    if (!district) {
      return res.status(200).json({ success: false, data: null, message: 'District not found' });
    }

    const state = await State.findByPk(district.state_id, { raw: true });
    if (!state) {
      return res.status(200).json({ success: false, data: null, message: 'State not found' });
    }

    return res.status(200).json({
      success: true,
      data: {
        city: { id: city.id, name: city.name },
        district: { id: district.id, name: district.name },
        state: { id: state.id, name: state.name }
      }
    });
  } catch (error) {
    return res.status(200).json({ success: false, data: null, message: error.message });
  }
};

export const getPublicSettings = async (req, res) => {
  try {
    let settings = [];
    try {
      settings = await PlatformSetting.findAll({ raw: true });
    } catch (_) {}

    let rm = null;
    try {
      rm = await RelationshipManager.findOne({ raw: true });
    } catch (_) {}

    const settingsObj = {};
    if (Array.isArray(settings)) {
      settings.forEach(s => {
        if (s && s.key) {
          settingsObj[s.key] = s.value;
        }
      });
    }

    const phoneVal = (rm && rm.mob) ? rm.mob : (settingsObj.support_phone || "1800-123-4567");

    return res.status(200).json({
      success: true,
      announcement_banner: settingsObj.announcement_banner || "",
      roi_disclaimer: settingsObj.roi_disclaimer || "",
      support_phone: phoneVal,
      rm_details: rm || null
    });
  } catch (error) {
    return res.status(200).json({
      success: true,
      announcement_banner: "",
      roi_disclaimer: "",
      support_phone: "1800-123-4567"
    });
  }
};
