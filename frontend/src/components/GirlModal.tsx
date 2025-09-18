// GirlModal.tsx
import { useEffect } from "react";
import axios from "axios";

interface GirlModalProps {
  open: boolean;
  onClose: () => void;
  girlId: number;
  girlName: string;
  profileUrl: string;
  onViewsUpdated?: () => void;
}

export default function GirlModal({
  open,
  onClose,
  girlId,
  girlName,
  profileUrl,
  onViewsUpdated,
}: GirlModalProps) {
  useEffect(() => {
    if (open && girlId) {
      axios.post(`/api/views/${girlId}`)
        .then(() => {
          if (onViewsUpdated) onViewsUpdated();
        })
        .catch((err) => console.error("Failed to increment views", err));
    }
  }, [open, girlId]);

  if (!open) return null;

  return (
    <div>
      <h2>{girlName}</h2>
      <a href={profileUrl} target="_blank" rel="noreferrer">View Profile</a>
      <button onClick={onClose}>Close</button>
    </div>
  );
}
