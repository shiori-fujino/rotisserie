import { useEffect, useState, useRef } from "react";
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
import { GoogleMap, InfoWindow, useLoadScript } from "@react-google-maps/api";
import { Link } from "react-router-dom";
  import drumstickIcon from "../assets/drumstick.svg"; // top of file


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
  const [activeShop, setActiveShop] = useState<Shop | null>(null);

  const mapRef = useRef<google.maps.Map | null>(null);
  const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";
  const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY as string;

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: GOOGLE_KEY,
    libraries: ["marker"],
  });

  /* -------------- Fetch data -------------- */
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

  const defaultCenter = userCoords || { lat: -33.8688, lng: 151.2093 }; // Sydney

  /* -------------- Marker creation -------------- */

const onMapLoad = (map: google.maps.Map) => {
  mapRef.current = map;
  console.log("✅ Map loaded");

  sorted
    .filter((shop) => shop.lat && shop.lng)
    .forEach((shop) => {
      const marker = new google.maps.Marker({
        position: { lat: shop.lat!, lng: shop.lng! },
        map,
        title: shop.name,
        icon: {
          url: drumstickIcon,
          scaledSize: new google.maps.Size(36, 36),
        },
      });

      marker.addListener("click", () => setActiveShop(shop));
    });
};


  /* ----------------------------- UI ----------------------------- */
  return (
    <Stack spacing={2} className="p-4" alignItems="center">
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

      {/* ---- Map ---- */}
      {isLoaded ? (
        <Paper sx={{ p: 1, width: "95vw", maxWidth: 1100, height: 400, borderRadius: 2 }}>
          <GoogleMap
            mapContainerStyle={{ width: "100%", height: "100%" }}
            zoom={userCoords ? 12 : 10}
            center={defaultCenter}
            onLoad={onMapLoad}
            options={{
              mapTypeControl: false,
              fullscreenControl: false,
              streetViewControl: false,
            }}
          >
            console.log("Map loaded 🗺️");

            {activeShop && (
              <InfoWindow
                position={{ lat: activeShop.lat!, lng: activeShop.lng! }}
                onCloseClick={() => setActiveShop(null)}
              >
                <div style={{ fontSize: 14 }}>
                  <strong>{activeShop.name}</strong>
                  <br />
                  <a href={`/shops/${activeShop.slug}`}>View shop →</a>
                </div>
              </InfoWindow>
            )}
          </GoogleMap>
        </Paper>
      ) : (
        <Typography variant="body2">Loading map...</Typography>
      )}

      {/* ---- Table ---- */}
      <TableContainer component={Paper} sx={{ borderRadius: 2, maxWidth: 1100 }}>
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
