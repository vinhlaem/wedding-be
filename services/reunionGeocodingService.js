const axios = require("axios");

const DA_NANG = { latitude: 16.0544, longitude: 108.2022 };
const MAX_DISTANCE_KM = 150;
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

const toRadians = (degrees) => (degrees * Math.PI) / 180;

const distanceFromDaNang = (latitude, longitude) => {
  const earthRadiusKm = 6371;
  const latitudeDelta = toRadians(latitude - DA_NANG.latitude);
  const longitudeDelta = toRadians(longitude - DA_NANG.longitude);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(DA_NANG.latitude)) *
      Math.cos(toRadians(latitude)) *
      Math.sin(longitudeDelta / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const getDrivingDistance = async (latitude, longitude) => {
  const coordinates = [
    `${DA_NANG.longitude},${DA_NANG.latitude}`,
    `${longitude},${latitude}`,
  ].join(";");
  const response = await axios.get(
    `https://router.project-osrm.org/route/v1/driving/${coordinates}`,
    {
      params: { overview: "false", alternatives: "false", steps: "false" },
      headers: {
        "User-Agent":
          process.env.GEOCODING_USER_AGENT ||
          "ABC1-Reunion/1.0 (reunion location validation)",
      },
      timeout: 10000,
    },
  );

  const distanceMeters = response.data?.routes?.[0]?.distance;
  if (!Number.isFinite(distanceMeters)) {
    throw new Error("ROUTE_NOT_FOUND");
  }

  return distanceMeters / 1000;
};

const searchLocation = async (query) => {
  const response = await axios.get(NOMINATIM_URL, {
    params: {
      q: query,
      format: "jsonv2",
      addressdetails: 1,
      countrycodes: "vn",
      limit: 1,
    },
    headers: {
      "User-Agent":
        process.env.GEOCODING_USER_AGENT ||
        "ABC1-Reunion/1.0 (reunion location validation)",
    },
    timeout: 8000,
  });

  return response.data?.[0] || null;
};

const geocodeLocation = async (location) => {
  let match = await searchLocation(`${location}, Việt Nam`);

  if (!match) {
    const administrativeArea = location
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .at(-1);

    if (administrativeArea) {
      match = await searchLocation(`${administrativeArea}, Đà Nẵng, Việt Nam`);
    }
  }

  if (!match) {
    const error = new Error("LOCATION_NOT_FOUND");
    error.code = "LOCATION_NOT_FOUND";
    throw error;
  }

  const latitude = Number(match.lat);
  const longitude = Number(match.lon);
  const directDistanceKm = distanceFromDaNang(latitude, longitude);
  if (directDistanceKm > MAX_DISTANCE_KM) {
    return {
      latitude,
      longitude,
      distanceKm: Math.round(directDistanceKm * 10) / 10,
      resolvedAddress: match.display_name,
      isWithinRange: false,
    };
  }

  const distanceKm = await getDrivingDistance(latitude, longitude);

  return {
    latitude,
    longitude,
    distanceKm: Math.round(distanceKm * 10) / 10,
    resolvedAddress: match.display_name,
    isWithinRange: distanceKm <= MAX_DISTANCE_KM,
  };
};

module.exports = {
  DA_NANG,
  MAX_DISTANCE_KM,
  distanceFromDaNang,
  getDrivingDistance,
  geocodeLocation,
  searchLocation,
};
