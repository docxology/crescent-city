/**
 * Intelligence domain data — structured knowledge about Crescent City's
 * key civic domains with cross-references to municipal code sections.
 *
 * Each domain contains curated intelligence that enhances the RAG pipeline
 * by providing context beyond what's in the raw municipal code text.
 */

export interface DomainSource {
  /** Municipal code section number (e.g., "§ 8.04.010") */
  sectionNumber: string;
  /** Brief description of relevance */
  relevance: string;
}

export interface DomainTopic {
  name: string;
  description: string;
  /** Cross-references to municipal code sections */
  sources: DomainSource[];
  /** External reference URLs */
  externalRefs?: string[];
  /** Tags for search/filtering */
  tags: string[];
}

export interface IntelligenceDomain {
  id: string;
  name: string;
  description: string;
  icon: string;
  topics: DomainTopic[];
  /** Last updated timestamp */
  updatedAt: string;
}

/** All intelligence domains */
export const domains: IntelligenceDomain[] = [
  // ─── Emergency Management ────────────────────────────────────
  {
    id: "emergency-management",
    name: "Emergency Management",
    icon: "🌊",
    description: "Tsunami preparedness, evacuation routes, emergency protocols, and mutual aid agreements for Crescent City — the most tsunami-impacted city in the contiguous United States.",
    updatedAt: "2026-03-13",
    topics: [
      {
        name: "Tsunami Preparedness & Evacuation",
        description: "Crescent City has experienced major tsunamis (1964 Alaska earthquake destroyed 29 blocks). The city's emergency management focuses heavily on tsunami warning systems, evacuation routes, and vertical evacuation structures.",
        sources: [
          { sectionNumber: "§ 8.04", relevance: "Health and Safety — emergency management authority" },
          { sectionNumber: "§ 9.04", relevance: "Public Peace — emergency powers and declarations" },
          { sectionNumber: "§ 15.04", relevance: "Building code — seismic and flood zone requirements" },
        ],
        externalRefs: [
          "https://www.tsunami.gov/",
          "https://www.weather.gov/eka/",
        ],
        tags: ["tsunami", "evacuation", "emergency", "natural disaster", "seismic"],
      },
      {
        name: "Mutual Aid Agreements",
        description: "Agreements with Del Norte County, Pelican Bay State Prison, and neighboring jurisdictions for emergency response coordination.",
        sources: [
          { sectionNumber: "§ 2.04", relevance: "Administration — intergovernmental agreements" },
          { sectionNumber: "§ 9.04", relevance: "Public Peace — mutual aid provisions" },
        ],
        tags: ["mutual aid", "pelican bay", "del norte county", "emergency response"],
      },
      {
        name: "Emergency Communication Systems",
        description: "Warning sirens, reverse 911, NOAA weather radio, and community alert systems.",
        sources: [
          { sectionNumber: "§ 9.04", relevance: "Emergency alert and notification systems" },
          { sectionNumber: "§ 13.04", relevance: "Public services — communication infrastructure" },
        ],
        externalRefs: [
          "https://www.co.del-norte.ca.us/departments/office-of-emergency-services",
        ],
        tags: ["sirens", "alerts", "warning systems", "communication"],
      },
    ],
  },

  // ─── Business Development ────────────────────────────────────
  {
    id: "business-development",
    name: "Business Development",
    icon: "🦀",
    description: "Business licensing, fishing and crabbing regulations, tourism permits, harbor operations, and economic development for Crescent City's marine-based economy.",
    updatedAt: "2026-03-13",
    topics: [
      {
        name: "Business Licenses & Permits",
        description: "Requirements for operating businesses within city limits, including special permits for food service, alcohol sales, and marijuana establishments.",
        sources: [
          { sectionNumber: "§ 5.04", relevance: "Business licenses — general requirements" },
          { sectionNumber: "§ 5.08", relevance: "Business license fees and categories" },
          { sectionNumber: "§ 5.12", relevance: "Specific business type regulations" },
        ],
        tags: ["business license", "permits", "fees", "commercial"],
      },
      {
        name: "Fishing & Crabbing Industry",
        description: "Crescent City is a major Dungeness crab port. Regulations cover commercial fishing operations, harbor use, fish processing facilities, and seasonal restrictions.",
        sources: [
          { sectionNumber: "§ 5.04", relevance: "Commercial fishing business licenses" },
          { sectionNumber: "§ 12.04", relevance: "Harbor and waterfront regulations" },
          { sectionNumber: "§ 13.04", relevance: "Public services — harbor facilities" },
        ],
        externalRefs: [
          "https://wildlife.ca.gov/fishing",
        ],
        tags: ["fishing", "crabbing", "harbor", "commercial fishing", "dungeness"],
      },
      {
        name: "Tourism & Short-Term Rentals",
        description: "Permits for vacation rentals, toured excursions, visitor-serving businesses, and special event operations.",
        sources: [
          { sectionNumber: "§ 5.04", relevance: "Tourism business licensing" },
          { sectionNumber: "§ 17.04", relevance: "Zoning — visitor-serving commercial zones" },
          { sectionNumber: "§ 17.08", relevance: "Land use — short-term rental regulations" },
        ],
        tags: ["tourism", "short-term rental", "vacation rental", "visitors"],
      },
      {
        name: "Harbor & Marine Facilities",
        description: "Crescent City Harbor is a working harbor with commercial fishing, recreational boating, and cruise ship support.",
        sources: [
          { sectionNumber: "§ 12.04", relevance: "Harbor regulations" },
          { sectionNumber: "§ 13.04", relevance: "Harbor utility services" },
          { sectionNumber: "§ 17.04", relevance: "Harbor zoning designations" },
        ],
        tags: ["harbor", "marina", "mooring", "boats", "port"],
      },
    ],
  },

  // ─── Environmental Protection ────────────────────────────────
  {
    id: "environmental-protection",
    name: "Environmental Protection",
    icon: "🌿",
    description: "Coastal protection, tsunami inundation zones, wetland buffers, stormwater management, and environmental regulations for Crescent City's sensitive coastal ecosystem.",
    updatedAt: "2026-03-13",
    topics: [
      {
        name: "Tsunami Inundation Zone Regulations",
        description: "Special building requirements, land-use restrictions, and development standards within FEMA-designated tsunami inundation zones.",
        sources: [
          { sectionNumber: "§ 15.04", relevance: "Building code — flood zone construction standards" },
          { sectionNumber: "§ 17.04", relevance: "Zoning — coastal overlay district" },
          { sectionNumber: "§ 17.08", relevance: "Special development standards in hazard zones" },
        ],
        externalRefs: [
          "https://www.conservation.ca.gov/cgs/tsunami/maps",
        ],
        tags: ["tsunami zone", "inundation", "flood zone", "hazard", "FEMA"],
      },
      {
        name: "Coastal Erosion & Shoreline Protection",
        description: "Regulations governing shoreline armoring, setback requirements, and coastal erosion management.",
        sources: [
          { sectionNumber: "§ 15.04", relevance: "Building setbacks from coastal bluffs" },
          { sectionNumber: "§ 17.04", relevance: "Coastal zone land use regulations" },
          { sectionNumber: "§ 16.04", relevance: "Subdivision — geologic hazard review requirements" },
        ],
        tags: ["erosion", "shoreline", "coastal", "setback", "bluff"],
      },
      {
        name: "Wetland & Riparian Protections",
        description: "Buffer zones around wetlands, creek corridors, and sensitive habitat areas.",
        sources: [
          { sectionNumber: "§ 17.04", relevance: "Environmental review overlays" },
          { sectionNumber: "§ 8.04", relevance: "Water quality and discharge standards" },
          { sectionNumber: "§ 13.04", relevance: "Stormwater management" },
        ],
        tags: ["wetland", "riparian", "buffer", "habitat", "stormwater"],
      },
    ],
  },

  // ─── Public Safety ───────────────────────────────────────────
  {
    id: "public-safety",
    name: "Public Safety",
    icon: "🛡️",
    description: "Law enforcement, noise ordinances, prison-related regulations, and community safety protocols for Crescent City, home to Pelican Bay State Prison.",
    updatedAt: "2026-03-13",
    topics: [
      {
        name: "Noise Ordinances",
        description: "Restrictions on noise levels, quiet hours, construction noise, and amplified sound in residential and commercial areas.",
        sources: [
          { sectionNumber: "§ 9.04", relevance: "Public peace — noise restrictions" },
          { sectionNumber: "§ 9.08", relevance: "Nuisance abatement" },
          { sectionNumber: "§ 17.04", relevance: "Zoning — noise performance standards" },
        ],
        tags: ["noise", "quiet hours", "nuisance", "sound", "construction"],
      },
      {
        name: "Prison-Related Regulations",
        description: "Pelican Bay State Prison (PBSP) is a supermax facility near Crescent City. Regulations address contraband, parolee housing, and prison-adjacent land use.",
        sources: [
          { sectionNumber: "§ 9.04", relevance: "Public peace — unlawful activities" },
          { sectionNumber: "§ 5.04", relevance: "Business regulations near correctional facilities" },
          { sectionNumber: "§ 17.04", relevance: "Zoning — restricted zones near PBSP" },
        ],
        tags: ["prison", "pelican bay", "correctional", "parolee", "contraband"],
      },
      {
        name: "Vehicle & Traffic Safety",
        description: "Speed limits, parking regulations, pedestrian safety, and traffic control in the city.",
        sources: [
          { sectionNumber: "§ 10.04", relevance: "Vehicle code enforcement" },
          { sectionNumber: "§ 10.08", relevance: "Speed limits and traffic signals" },
          { sectionNumber: "§ 10.12", relevance: "Parking regulations" },
        ],
        tags: ["traffic", "parking", "speed", "pedestrian", "vehicle"],
      },
    ],
  },

  // ─── Event Planning ──────────────────────────────────────────
  {
    id: "event-planning",
    name: "Event Planning",
    icon: "🎪",
    description: "Special event permitting, mass gathering safety, waterfront events, tsunami drill coordination, and public assembly regulations.",
    updatedAt: "2026-03-13",
    topics: [
      {
        name: "Special Event Permits",
        description: "Requirements for organizing public events, festivals, parades, and gatherings in public spaces.",
        sources: [
          { sectionNumber: "§ 12.04", relevance: "Use of public streets and sidewalks" },
          { sectionNumber: "§ 9.04", relevance: "Public assembly and crowd control" },
          { sectionNumber: "§ 5.04", relevance: "Temporary business permits for events" },
        ],
        tags: ["event", "permit", "festival", "parade", "gathering"],
      },
      {
        name: "Waterfront & Harbor Events",
        description: "Special requirements for events at the harbor, Battery Point, and Beachfront Park areas.",
        sources: [
          { sectionNumber: "§ 12.04", relevance: "Harbor area use permits" },
          { sectionNumber: "§ 17.04", relevance: "Waterfront zone event regulations" },
        ],
        tags: ["waterfront", "harbor", "beach", "outdoor event"],
      },
      {
        name: "Tsunami Evacuations & Drills",
        description: "Annual tsunami drill requirements, evacuation route signage, and public education programs.",
        sources: [
          { sectionNumber: "§ 9.04", relevance: "Emergency drill authority" },
          { sectionNumber: "§ 8.04", relevance: "Public health emergency exercises" },
        ],
        externalRefs: [
          "https://www.tsunamizone.org/",
        ],
        tags: ["tsunami drill", "evacuation", "emergency exercise", "preparedness"],
      },
      {
        name: "Noise & Amplification Controls",
        description: "Regulations for amplified music, crowd noise, and sound equipment at public events.",
        sources: [
          { sectionNumber: "§ 9.04", relevance: "Noise and amplification limits" },
        ],
        tags: ["amplified sound", "music", "noise permit", "crowd"],
      },
    ],
  },
];

/** Get a domain by its ID */
export function getDomainById(id: string): IntelligenceDomain | undefined {
  return domains.find(d => d.id === id);
}

/** Get all domain summaries (without topics) for listing */
export function getDomainSummaries(): Array<{
  id: string;
  name: string;
  description: string;
  icon: string;
  topicCount: number;
  updatedAt: string;
}> {
  return domains.map(d => ({
    id: d.id,
    name: d.name,
    description: d.description,
    icon: d.icon,
    topicCount: d.topics.length,
    updatedAt: d.updatedAt,
  }));
}

/** Search domains by keyword */
export function searchDomains(query: string): IntelligenceDomain[] {
  const q = query.toLowerCase();
  return domains.filter(d =>
    d.name.toLowerCase().includes(q) ||
    d.description.toLowerCase().includes(q) ||
    d.topics.some(t =>
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.tags.some(tag => tag.includes(q))
    )
  );
}
