// types.ts
export interface RosterItem {
  id: number;         // ✅ new
  shop: string;
  name: string;
  origin: string;
  originCode: string;
  shift: string;
  profile: string;
  photo: string;
  photos?: string[];
  views?: number;
  commentsCount?: number;
}

export interface Review {
  id: number;
  rating: number;
  comment: string;
  created_at: string;
}