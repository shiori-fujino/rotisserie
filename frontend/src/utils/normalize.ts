// src/utils/normalize.ts
export function normalizeOrigin(raw: string): string {
    if (!raw) return "";
  
    const map: Record<string, string> = {
      // Japanese
      j: "Japanese",
      jp: "Japanese",
      japan: "Japanese",
      japanese: "Japanese",
  
      // Chinese
      c: "Chinese",
      cn: "Chinese",
      china: "Chinese",
      chinese: "Chinese",
  
      // Korean
      k: "Korean",
      kr: "Korean",
      korea: "Korean",
      korean: "Korean",
  
      // Thai
      t: "Thai",
      th: "Thai",
      thailand: "Thai",
  
      // Vietnamese
      v: "Vietnamese",
      vn: "Vietnamese",
      vietnam: "Vietnamese",
  
      // Filipino
      f: "Filipina",
      ph: "Filipina",
      philippines: "Filipina",
  
      // Indonesian
      i: "Indonesian",
      indo: "Indonesian",
      indonesia: "Indonesian",
  
      // Malaysian
      m: "Malaysian",
      my: "Malaysian",
      malaysia: "Malaysian",
  
      // Singaporean
      sg: "Singaporean",
      sgp: "Singaporean",
      singapore: "Singaporean",
  
      // Taiwanese
      tw: "Taiwanese",
      taiwan: "Taiwanese",
  
      // Hong Kong
      hk: "Hong Kong",
      "hong kong": "Hong Kong",
  
      // Indian
      in: "Indian",
      india: "Indian",
  
      // Nepalese
      np: "Nepalese",
      nepal: "Nepalese",
  
      // Mongolian
      mn: "Mongolian",
      mongolia: "Mongolian",
  
      // Eurasian / Mixed
      eur: "Eurasian",
      eurasian: "Eurasian",
      mix: "Mixed",
  
      // Australian
      au: "Australian",
      aus: "Australian",
      australia: "Australian",
    };
  
    const cleaned = raw.trim().toLowerCase();
    return map[cleaned] || "Other";
  }
  