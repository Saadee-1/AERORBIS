/**
 * Standard Atmosphere 1976 Constants
 * 
 * All constants from U.S. Standard Atmosphere 1976
 */

// Earth constants
export const EARTH_RADIUS = 6371000; // meters (R_e)

// Gas constant
export const GAS_CONSTANT_R = 287.053; // J/(kg·K)

// Standard gravity
export const GRAVITY_SEA_LEVEL = 9.80665; // m/s² (g0)

// Specific heat ratio (gamma)
export const GAMMA = 1.4; // dimensionless

// Sutherland's law constants for viscosity
export const VISCOSITY_REF_TEMP = 273.15; // K (T0)
export const VISCOSITY_REF_VALUE = 1.716e-5; // Pa·s (μ0)
export const SUTHERLAND_CONSTANT = 110.4; // K (S)

// Sea level reference values (1976 Standard Atmosphere)
export const SEA_LEVEL_TEMP = 288.15; // K
export const SEA_LEVEL_PRESSURE = 101325; // Pa
export const SEA_LEVEL_DENSITY = 1.225; // kg/m³
export const SEA_LEVEL_SPEED_OF_SOUND = 340.294; // m/s

// Altitude limits (geopotential)
export const MIN_ALTITUDE = 0; // m
export const MAX_ALTITUDE = 150000; // m (150 km) - covers LEO entry and Karman line

