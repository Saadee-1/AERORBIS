/**
 * Comprehensive Aerospace Materials Database
 * 100+ materials organized by category with density, description, and properties.
 */

import { Material } from "../types";

// ─── METALS ──────────────────────────────────────────────
const METALS: Material[] = [
  { name: "Aluminum 2024-T3", category: "Metal", density: 2780, description: "High strength aircraft aluminum alloy used in fuselage skins" },
  { name: "Aluminum 2024-T4", category: "Metal", density: 2780, description: "Solution heat-treated variant for formable sheet applications" },
  { name: "Aluminum 6061-T6", category: "Metal", density: 2700, description: "General-purpose alloy used in spacecraft structures and machining" },
  { name: "Aluminum 7050-T7451", category: "Metal", density: 2830, description: "Thick plate alloy for wing skins and bulkheads" },
  { name: "Aluminum 7075-T6", category: "Metal", density: 2810, description: "Very high strength alloy for wing spars and landing gear" },
  { name: "Aluminum 7475-T7351", category: "Metal", density: 2810, description: "High fracture toughness alloy for critical structures" },
  { name: "Aluminum-Lithium 2195", category: "Metal", density: 2710, description: "Low-density Al-Li alloy used in Space Shuttle External Tank" },
  { name: "Aluminum-Lithium 2090", category: "Metal", density: 2590, description: "First-gen Al-Li alloy with high specific stiffness" },
  { name: "Titanium Ti-6Al-4V", category: "Metal", density: 4430, description: "Primary aerospace titanium alloy used in jet engines and spacecraft" },
  { name: "Titanium Ti-6Al-2Sn-4Zr-2Mo", category: "Metal", density: 4540, description: "High-temp titanium alloy for compressor discs" },
  { name: "Titanium Ti-10V-2Fe-3Al", category: "Metal", density: 4650, description: "Beta titanium for landing gear forgings" },
  { name: "Titanium CP Grade 2", category: "Metal", density: 4500, description: "Commercially pure titanium, corrosion resistant" },
  { name: "Titanium Ti-5Al-2.5Sn", category: "Metal", density: 4480, description: "Weldable alpha titanium for cryogenic applications" },
  { name: "Stainless Steel 304", category: "Metal", density: 8000, description: "Common stainless steel, corrosion resistant" },
  { name: "Stainless Steel 316", category: "Metal", density: 8000, description: "Marine-grade aerospace structural steel" },
  { name: "Stainless Steel 17-4 PH", category: "Metal", density: 7780, description: "Precipitation-hardened steel for fasteners and fittings" },
  { name: "Stainless Steel 15-5 PH", category: "Metal", density: 7800, description: "High-strength martensitic steel for valves and turbine parts" },
  { name: "Stainless Steel A286", category: "Metal", density: 7920, description: "Austenitic superalloy for jet engine fasteners" },
  { name: "Maraging Steel 250", category: "Metal", density: 8100, description: "Ultra-high strength steel for rocket motor casings" },
  { name: "Maraging Steel 300", category: "Metal", density: 8100, description: "Higher strength variant for solid rocket cases" },
  { name: "4340 Steel", category: "Metal", density: 7850, description: "High-strength low-alloy steel for landing gear" },
  { name: "300M Steel", category: "Metal", density: 7890, description: "Modified 4340 for critical landing gear components" },
  { name: "Magnesium AZ31B", category: "Metal", density: 1770, description: "Wrought magnesium alloy for gearbox housings" },
  { name: "Magnesium AZ91D", category: "Metal", density: 1810, description: "Cast magnesium for helicopter transmission cases" },
  { name: "Magnesium ZE41A", category: "Metal", density: 1840, description: "High-temp magnesium for engine casings" },
  { name: "Beryllium S-200F", category: "Metal", density: 1850, description: "Lightweight metal for satellite structural members" },
  { name: "Copper C10200", category: "Metal", density: 8940, description: "Oxygen-free copper for thrust chamber liners" },
  { name: "Copper-Beryllium C17200", category: "Metal", density: 8250, description: "High-strength copper alloy for electrical connectors" },
  { name: "Tungsten W", category: "Metal", density: 19300, description: "Ultra-dense metal for radiation shielding and ballast" },
  { name: "Molybdenum Mo", category: "Metal", density: 10220, description: "Refractory metal for high-temp rocket nozzle inserts" },
  { name: "Niobium C-103", category: "Metal", density: 8850, description: "Refractory alloy for rocket nozzle extensions" },
  { name: "Tantalum Ta", category: "Metal", density: 16650, description: "Corrosion-resistant refractory for chemical rockets" },
  { name: "Brass C36000", category: "Metal", density: 8500, description: "Free-cutting brass for fittings and connectors" },
];

// ─── SUPERALLOYS ─────────────────────────────────────────
const SUPERALLOYS: Material[] = [
  { name: "Inconel 718", category: "Superalloy", density: 8190, description: "Primary nickel superalloy for jet engine turbine discs" },
  { name: "Inconel 625", category: "Superalloy", density: 8440, description: "Heat-resistant alloy for exhaust systems and ducting" },
  { name: "Inconel X-750", category: "Superalloy", density: 8280, description: "Age-hardenable alloy for springs and gas turbine parts" },
  { name: "Hastelloy X", category: "Superalloy", density: 8220, description: "Combustion chamber and afterburner components" },
  { name: "Hastelloy C-276", category: "Superalloy", density: 8890, description: "Corrosion-resistant alloy for chemical processing" },
  { name: "Waspaloy", category: "Superalloy", density: 8190, description: "Nickel superalloy for turbine discs and shafts" },
  { name: "René 41", category: "Superalloy", density: 8250, description: "High-temp alloy for afterburner parts" },
  { name: "Haynes 230", category: "Superalloy", density: 8970, description: "Excellent oxidation resistance for combustors" },
  { name: "MAR-M247", category: "Superalloy", density: 8530, description: "Cast nickel alloy for turbine blades" },
  { name: "CMSX-4 (Single Crystal)", category: "Superalloy", density: 8700, description: "Single-crystal alloy for high-pressure turbine blades" },
  { name: "PWA 1484", category: "Superalloy", density: 8950, description: "Pratt & Whitney single-crystal blade alloy" },
  { name: "Stellite 6", category: "Superalloy", density: 8380, description: "Cobalt alloy for wear-resistant valve components" },
];

// ─── COMPOSITES ──────────────────────────────────────────
const COMPOSITES: Material[] = [
  { name: "CFRP Unidirectional (T300)", category: "Composite", density: 1550, description: "Standard modulus carbon fiber for aircraft structures" },
  { name: "CFRP Unidirectional (T700)", category: "Composite", density: 1570, description: "Intermediate modulus for next-gen aircraft wings" },
  { name: "CFRP Unidirectional (T800)", category: "Composite", density: 1580, description: "High-strength fiber for primary structures" },
  { name: "CFRP Woven Fabric", category: "Composite", density: 1650, description: "High stiffness fabric used in aircraft control surfaces" },
  { name: "CFRP High Modulus (M55J)", category: "Composite", density: 1800, description: "Ultra-high modulus for satellite structures" },
  { name: "CFRP Quasi-Isotropic Layup", category: "Composite", density: 1600, description: "Balanced layup for fuselage panels and fairings" },
  { name: "Fiberglass S-2 (GFRP)", category: "Composite", density: 1850, description: "High-strength glass fiber for radomes and fairings" },
  { name: "Fiberglass E-Glass (GFRP)", category: "Composite", density: 2000, description: "Standard glass fiber for non-structural applications" },
  { name: "Kevlar 49 (AFRP)", category: "Composite", density: 1380, description: "High-modulus aramid for ballistic and impact protection" },
  { name: "Kevlar 29 (AFRP)", category: "Composite", density: 1440, description: "Impact-resistant aramid for containment structures" },
  { name: "Boron/Epoxy", category: "Composite", density: 2000, description: "High stiffness composite for fighter aircraft repairs" },
  { name: "Aluminum Honeycomb Core", category: "Composite", density: 50, description: "Aircraft floor panels, fairings, and sandwich structures" },
  { name: "Nomex Honeycomb Core", category: "Composite", density: 48, description: "Fireproof lightweight core for aerospace panels" },
  { name: "Foam Core (Divinycell)", category: "Composite", density: 80, description: "PVC foam core for marine and aerospace sandwich panels" },
  { name: "Carbon/Carbon (C/C)", category: "Composite", density: 1750, description: "Ultra-high temp composite for brake discs and nozzles" },
  { name: "Ceramic Matrix Composite (CMC)", category: "Composite", density: 2100, description: "SiC/SiC for turbine shrouds and hot-section components" },
  { name: "Metal Matrix Composite (Al-SiC)", category: "Composite", density: 2880, description: "Aluminum reinforced with SiC particles for high stiffness" },
];

// ─── POLYMERS ────────────────────────────────────────────
const POLYMERS: Material[] = [
  { name: "PEEK (Aerospace Grade)", category: "Polymer", density: 1320, description: "High-temp polymer for bearings and seals" },
  { name: "PEI (Ultem 1000)", category: "Polymer", density: 1270, description: "Flame-retardant thermoplastic for aircraft interiors" },
  { name: "PPS (Ryton)", category: "Polymer", density: 1350, description: "Chemical-resistant polymer for brackets and clips" },
  { name: "Polycarbonate", category: "Polymer", density: 1200, description: "Impact-resistant transparent polymer for canopies" },
  { name: "Nylon PA6", category: "Polymer", density: 1150, description: "Engineering plastic for gears and bushings" },
  { name: "Nylon PA66", category: "Polymer", density: 1140, description: "Higher melting point nylon for structural fasteners" },
  { name: "ABS Plastic", category: "Polymer", density: 1050, description: "Common polymer for housings and interior components" },
  { name: "PTFE (Teflon)", category: "Polymer", density: 2170, description: "Low-friction polymer for seals and bearings" },
  { name: "Polyimide (Kapton)", category: "Polymer", density: 1420, description: "High-temp film for wire insulation and flex circuits" },
  { name: "Epoxy Resin (Aerospace)", category: "Polymer", density: 1200, description: "Matrix material for carbon fiber composites" },
  { name: "Silicone Rubber", category: "Polymer", density: 1100, description: "Flexible sealant for thermal protection" },
  { name: "UHMWPE", category: "Polymer", density: 940, description: "Ultra-high molecular weight PE for impact liners" },
];

// ─── CERAMICS & TPS ──────────────────────────────────────
const CERAMICS: Material[] = [
  { name: "Silica Tile (HRSI)", category: "Ceramic", density: 144, description: "Space Shuttle high-temp reusable surface insulation" },
  { name: "Silica Tile (LRSI)", category: "Ceramic", density: 130, description: "Low-temp reusable surface insulation tiles" },
  { name: "TUFROC", category: "Ceramic", density: 320, description: "NASA next-gen TPS for Orion and commercial vehicles" },
  { name: "Zirconia Ceramic (ZrO₂)", category: "Ceramic", density: 5600, description: "Thermal barrier coating for turbine blades" },
  { name: "Alumina Ceramic (Al₂O₃)", category: "Ceramic", density: 3950, description: "Electrical insulation and wear components" },
  { name: "Silicon Carbide (SiC)", category: "Ceramic", density: 3210, description: "High-temp structural ceramic for heat exchangers" },
  { name: "Silicon Nitride (Si₃N₄)", category: "Ceramic", density: 3200, description: "Turbine and bearing components" },
  { name: "Boron Nitride (BN)", category: "Ceramic", density: 2100, description: "Thermal insulation and high-temp lubricant" },
  { name: "PICA (Phenolic Impregnated)", category: "Ceramic", density: 270, description: "Ablative TPS used on SpaceX Dragon and Stardust" },
  { name: "SLA-561V", category: "Ceramic", density: 260, description: "Mars mission ablative heatshield material" },
  { name: "Reinforced Carbon-Carbon (RCC)", category: "Ceramic", density: 1700, description: "Shuttle nose cap and wing leading edges" },
];

// ─── FOAMS ───────────────────────────────────────────────
const FOAMS: Material[] = [
  { name: "Rohacell 51 IG", category: "Foam", density: 52, description: "Aerospace-grade PMI foam for CFRP sandwich structures" },
  { name: "Rohacell 110 IG", category: "Foam", density: 110, description: "Higher density PMI foam for structural cores" },
  { name: "Polyurethane Foam (Rigid)", category: "Foam", density: 40, description: "Used in UAV wings and insulation" },
  { name: "EPS Foam", category: "Foam", density: 20, description: "Lightweight expanded polystyrene insulation" },
  { name: "XPS Foam", category: "Foam", density: 35, description: "Extruded polystyrene for structural cores" },
  { name: "Aerogel", category: "Foam", density: 3, description: "Ultra-low density insulation for Mars rovers" },
  { name: "Polymethacrylimide (PMI)", category: "Foam", density: 75, description: "High-performance structural foam core" },
];

// ─── FLUIDS & PROPELLANTS ────────────────────────────────
const FLUIDS: Material[] = [
  { name: "Jet A-1 Fuel", category: "Fluid", density: 804, description: "Standard international aviation turbine fuel" },
  { name: "JP-8 (Military Jet Fuel)", category: "Fluid", density: 800, description: "NATO standard military jet fuel" },
  { name: "JP-5 (Naval Jet Fuel)", category: "Fluid", density: 827, description: "High flash point fuel for carrier operations" },
  { name: "RP-1 (Rocket Kerosene)", category: "Fluid", density: 810, description: "Falcon 9, Soyuz, Saturn I rocket fuel" },
  { name: "Liquid Oxygen (LOX)", category: "Fluid", density: 1141, description: "Most common rocket oxidizer" },
  { name: "Liquid Hydrogen (LH₂)", category: "Fluid", density: 70, description: "Cryogenic fuel for SLS and SSME" },
  { name: "Liquid Methane (LCH₄)", category: "Fluid", density: 423, description: "Fuel for SpaceX Raptor and BE-4 engines" },
  { name: "N₂O₄ (Nitrogen Tetroxide)", category: "Fluid", density: 1440, description: "Storable hypergolic oxidizer" },
  { name: "UDMH (Unsymmetrical Dimethylhydrazine)", category: "Fluid", density: 793, description: "Storable hypergolic fuel for satellites" },
  { name: "MMH (Monomethylhydrazine)", category: "Fluid", density: 874, description: "Hypergolic fuel for orbital maneuvering" },
  { name: "Hydrazine (N₂H₄)", category: "Fluid", density: 1004, description: "Monopropellant for attitude control thrusters" },
  { name: "Water", category: "Fluid", density: 1000, description: "Standard fluid reference / coolant" },
  { name: "Helium (Pressurized, 300 bar)", category: "Fluid", density: 48, description: "Pressurant gas for propellant tanks" },
  { name: "Nitrogen (Liquid)", category: "Fluid", density: 808, description: "Cryogenic purge and inerting fluid" },
];

// ─── WOOD ────────────────────────────────────────────────
const WOODS: Material[] = [
  { name: "Balsa Wood", category: "Wood", density: 160, description: "Ultra-lightweight for RC and experimental aircraft" },
  { name: "Spruce (Sitka)", category: "Wood", density: 400, description: "Traditional wooden aircraft structures" },
  { name: "Birch Plywood (Aircraft Grade)", category: "Wood", density: 680, description: "Laminated wood for vintage aircraft skins" },
  { name: "Douglas Fir", category: "Wood", density: 530, description: "Structural timber for experimental aircraft" },
];

// ─── COATINGS & ADHESIVES ────────────────────────────────
const COATINGS: Material[] = [
  { name: "Thermal Barrier Coating (YSZ)", category: "Coating", density: 5100, description: "Yttria-stabilized zirconia for turbine blades" },
  { name: "Chromium Plating", category: "Coating", density: 7190, description: "Hard chrome for landing gear and hydraulic actuators" },
  { name: "Cadmium Plating", category: "Coating", density: 8650, description: "Corrosion protection for fasteners (being phased out)" },
  { name: "Anodized Aluminum Layer", category: "Coating", density: 3100, description: "Protective oxide layer for aluminum structures" },
  { name: "Aerospace Primer (Epoxy)", category: "Coating", density: 1400, description: "Corrosion-inhibiting primer for aircraft surfaces" },
  { name: "Structural Adhesive (FM 94)", category: "Coating", density: 1200, description: "Film adhesive for metal-to-composite bonding" },
];

// Combine all materials
export const ALL_MATERIALS: Material[] = [
  ...METALS,
  ...SUPERALLOYS,
  ...COMPOSITES,
  ...POLYMERS,
  ...CERAMICS,
  ...FOAMS,
  ...FLUIDS,
  ...WOODS,
  ...COATINGS,
];

// Category metadata for display
export const MATERIAL_CATEGORIES = [
  { id: "All", label: "All Materials", count: ALL_MATERIALS.length },
  { id: "Metal", label: "Metals & Alloys", count: METALS.length },
  { id: "Superalloy", label: "Superalloys", count: SUPERALLOYS.length },
  { id: "Composite", label: "Composites", count: COMPOSITES.length },
  { id: "Polymer", label: "Polymers", count: POLYMERS.length },
  { id: "Ceramic", label: "Ceramics & TPS", count: CERAMICS.length },
  { id: "Foam", label: "Foams & Cores", count: FOAMS.length },
  { id: "Fluid", label: "Fluids & Propellants", count: FLUIDS.length },
  { id: "Wood", label: "Wood", count: WOODS.length },
  { id: "Coating", label: "Coatings & Adhesives", count: COATINGS.length },
  { id: "Other", label: "Other / Custom", count: 0 },
] as const;
