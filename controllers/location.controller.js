import State from "../models/state.js";
import District from "../models/district.js";
import City from "../models/city.js";

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
