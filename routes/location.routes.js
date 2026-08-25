import express from "express";
import {
  getStates,
  getDistricts,
  getCities,
  getAllCities,
  createOrGetCity,
  getLocationByPincode,
  getPublicSettings
} from "../controllers/location.controller.js";

const router = express.Router();

router.get("/states", getStates);
router.get("/districts/:stateId", getDistricts);
router.get("/cities/:districtId", getCities);
router.get("/all-cities", getAllCities);
router.post("/create-city", createOrGetCity);
router.get("/pincode/:pincode", getLocationByPincode);
router.get("/public-settings", getPublicSettings);

export default router;
