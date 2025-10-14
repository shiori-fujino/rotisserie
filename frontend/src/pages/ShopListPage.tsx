import { useEffect, useState } from "react";
import {
  Button,
  Stack,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
} from "@mui/material";
import { Link } from "react-router-dom";

/* ----------------------------- Types ----------------------------- */
interface Shop {
  id: number;
  name: string;
  slug: string;
  address?: string;
  lat?: number;
  lng?: number;
  girls_today?: number;
  distance?: number;
}

/* ----------------------------- Utils ----------------------------- */
function calcDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatKm(km?: number) {
  return km ? `${km.toFixed(1)} km` : "—";
}

/* ----------------------------- Component ----------------------------- */
export default function ShopListPage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [sortBy, setSortBy] = useState("name");
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";

  // Fake data
  useEffect(() => {
    fetch(`${API_BASE}/api/shops`)
    .then((res) => res.json())
    .then(setShops)
    .catch(console.error);
  }, []);

  /* -------------- Near-me logic -------------- */
  const handleNearMe = () => {
    if (!navigator.geolocation) {
      alert("Geolocation not supported 😭");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const updated = shops.map((s) => {
          if (s.lat && s.lng) {
            const dist = calcDistance(latitude, longitude, s.lat, s.lng);
            return { ...s, distance: dist };
          }
          return s;
        });
        setUserCoords({ lat: latitude, lng: longitude });
        setShops(updated);
      },
      () => alert("Failed to get your location 🥲")
    );
  };

  /* -------------- Sort -------------- */
  const sorted = [...shops].sort((a, b) => {
    if (sortBy === "name") return a.name.localeCompare(b.name);
    if (sortBy === "girls") return (b.girls_today ?? 0) - (a.girls_today ?? 0);
    if (sortBy === "distance") return (a.distance ?? 0) - (b.distance ?? 0);
    return 0;
  });

  /* ----------------------------- UI ----------------------------- */
  return (
    <Stack spacing={2} className="p-4">
      <Typography variant="h5">🏠 All Shops</Typography>

      {/* ---- Controls ---- */}
      <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
        <FormControl size="small" sx={{ width: 180 }}>
          <InputLabel>Sort by</InputLabel>
          <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <MenuItem value="name">Name (A-Z)</MenuItem>
            <MenuItem value="girls">Girls count</MenuItem>
            <MenuItem value="distance" disabled={!userCoords}>
              Distance
            </MenuItem>
          </Select>
        </FormControl>

        <Button variant="outlined" onClick={handleNearMe}>
          📍 Near me
        </Button>
      </Stack>

      {/* ---- Table ---- */}
      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Shop</TableCell>
              <TableCell>Girls Today</TableCell>
              <TableCell>Address</TableCell>
              {userCoords && <TableCell>Distance</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {sorted.map((shop) => (
              <TableRow key={shop.id} hover>
                <TableCell>
                  <Link to={`/shops/${shop.slug}`}>{shop.name}</Link>
                </TableCell>
                <TableCell>{shop.girls_today ?? 0}</TableCell>
                <TableCell>{shop.address ?? "—"}</TableCell>
                {userCoords && <TableCell>{formatKm(shop.distance)}</TableCell>}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
}
