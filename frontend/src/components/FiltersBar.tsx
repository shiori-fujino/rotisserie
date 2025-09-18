import { Box, FormControl, InputLabel, Select, MenuItem } from "@mui/material";
import type { Filters } from "./FiltersBar.types";

interface Props {
  value: Filters;
  onChange: (f: Filters) => void;
  shops?: string[];
  origins?: string[];
}

export default function FiltersBar({ value, onChange, shops = [], origins = [] }: Props) {
  const menuProps = { disableScrollLock: true, disablePortal: true } as const;

  return (
    <Box
      sx={{
        display: "flex",
        gap: 2,
        alignItems: "center",
        flexWrap: "nowrap",
        width: "100%",
      }}
    >
      {/* Shop */}
      <FormControl size="small" sx={{ flex: 1 }}>
        <InputLabel>Shop</InputLabel>
        <Select
          value={value.shop}
          label="Shop"
          onChange={(e) => onChange({ ...value, shop: e.target.value })}
          MenuProps={menuProps}
        >
          <MenuItem value="">All Shops</MenuItem>
          {shops.map((s) => (
            <MenuItem key={s} value={s}>{s}</MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Nationality */}
      <FormControl size="small" sx={{ flex: 1 }}>
        <InputLabel>Nationality</InputLabel>
        <Select
          value={value.origin}
          label="Nationality"
          onChange={(e) => onChange({ ...value, origin: e.target.value })}
          MenuProps={menuProps}
        >
          <MenuItem value="">All Nationalities</MenuItem>
          {origins.map((o) => (
            <MenuItem key={o} value={o}>{o}</MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Sort by Views (two explicit options) */}
      <FormControl size="small" sx={{ flex: 1 }}>
  <InputLabel>Views</InputLabel>
  <Select
    label="Views"
    value={value.sort}
    onChange={(e) => onChange({ ...value, sort: e.target.value })}
    >
    <MenuItem value="popularity-desc">High → Low</MenuItem>
    <MenuItem value="popularity-asc">Low → High</MenuItem>
  </Select>
</FormControl>
    </Box>
  );
}
/**
 * 📝 MUI <Select> Cheat Sheet (for my sanity):
 *
 * 1. If "empty" is a REAL option (like "All Shops"):
 *    - Keep <InputLabel>
 *    - Add <MenuItem value="">All Shops</MenuItem>
 *    - Default state = "" (so it shows that option)
 *
 * 2. If "empty" is just a PLACEHOLDER (like "Views"):
 *    - Keep <InputLabel>
 *    - DO NOT add <MenuItem value="">
 *    - Default state = "" (so label shows inside until a real value is picked)
 *
 * ✅ Rule of thumb:
 *    - Empty MenuItem = user can pick it as an option
 *    - No empty MenuItem = label is only a placeholder
 */
