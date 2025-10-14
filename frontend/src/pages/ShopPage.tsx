import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Card, CardContent, Typography, Divider } from "@mui/material";
import ShopRosterGrid from "../components/ShopRosterGrid";
import GirlModal from "../components/GirlModal";
import type { RosterItem } from "../types";

interface Shop {
  id: number;
  name: string;
  slug: string;
  website: string;
  phone: string;
  address: string;
  google_map_embed?: string;
  description?: string;
}

export default function ShopPage() {
  const { slug } = useParams();
  const [shop, setShop] = useState<Shop | null>(null);
  const [roster, setRoster] = useState<RosterItem[]>([]);
  const [selectedGirl, setSelectedGirl] = useState<RosterItem | null>(null);

  useEffect(() => {
    async function fetchShopData() {
      const [shopRes, rosterRes] = await Promise.all([
        fetch(`/api/shops/${slug}`),
        fetch(`/api/roster?shop_slug=${slug}`),
      ]);
      setShop(await shopRes.json());
      setRoster(await rosterRes.json());
    }
    fetchShopData();
  }, [slug]);

  if (!shop) return <Typography>Loading...</Typography>;

  return (
    <div className="p-4 space-y-6">
      {/* ---------- SHOP HEADER ---------- */}
      <Card sx={{ borderRadius: 2, overflow: "hidden" }}>
        <CardContent>
          <Typography variant="h5" fontWeight="bold">
            {shop.name}
          </Typography>
          {shop.address && (
            <Typography variant="body2" color="text.secondary">
              📍 {shop.address}
            </Typography>
          )}
          {shop.phone && (
            <Typography variant="body2" color="text.secondary">
              ☎️ {shop.phone}
            </Typography>
          )}
          {shop.website && (
            <Typography
              component="a"
              href={shop.website}
              target="_blank"
              rel="noopener noreferrer"
            >
              🌐 Visit website
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* ---------- GOOGLE MAP ---------- */}
      {shop.google_map_embed && (
        <div className="rounded-xl overflow-hidden">
          <iframe
            src={shop.google_map_embed}
            width="100%"
            height="250"
            loading="lazy"
            allowFullScreen
          />
        </div>
      )}

      {/* ---------- DESCRIPTION ---------- */}
      {shop.description && (
        <Card>
          <CardContent>
            <Typography variant="body1">{shop.description}</Typography>
          </CardContent>
        </Card>
      )}

      <Divider />

      {/* ---------- ROSTER GRID ---------- */}
      <Typography variant="h6">Today’s Girls 🔥</Typography>
      <ShopRosterGrid items={roster} onSelect={setSelectedGirl} />

      {selectedGirl && (
  <GirlModal
    open={true}
    onClose={() => setSelectedGirl(null)}
    girlId={selectedGirl.id}
    girlName={selectedGirl.name}
    profileUrl={selectedGirl.profileUrl}
  />
)}

      {/* ---------- COMMENTS / REVIEWS (optional) ---------- */}
      {/* You can later add <ShopReviews shopId={shop.id} /> here */}
    </div>
  );
}
