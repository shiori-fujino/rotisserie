import RosterGrid from "../components/RosterGrid";
import type { RosterItem } from "../types";

export default function ShopRosterGrid({
  items,
  onSelect,
}: {
  items: RosterItem[];
  onSelect: (girl: RosterItem) => void;
}) {
  if (!items?.length) return <p>No roster available today 😴</p>;
  return <RosterGrid items={items} layout="grid" onSelect={onSelect} />;
}

