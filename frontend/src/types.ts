// types.ts
export interface RosterItem {
  id: number;
  shop: string;
  name: string;

  origin?: string;        // ✅ allow either pretty label or raw
  originCode?: string;    // ✅ raw code if available
  shift?: string;         // ✅ sometimes missing
  profileUrl: string;     // ✅ standardize on this
  profile?: string;       // optional, only if some scraper gives you both

  photo: string;
  photos?: string[];

  views?: number;
  commentsCount?: number;
  reviewsCount?: number;
  avgRating?: number;
}


export interface Review {
  id: number;
  rating: number;
  comment: string;
  created_at: string;
}