export type Role = "user" | "owner" | "admin";

export type ListingType = "rent" | "sale";

export type PropertyType =
  | "house"
  | "apartment"
  | "portion"
  | "room"
  | "plot"
  | "shop"
  | "office"
  | "warehouse";

export type PropertyStatus =
  | "draft"
  | "pending"
  | "active"
  | "paused"
  | "sold"
  | "rented"
  | "expired"
  | "rejected"
  | "suspended";

export type VerificationStatus = "unverified" | "pending" | "verified" | "rejected" | "suspended";

export type PricePerUnit = "monthly" | "yearly" | "total";

export type PropertyAreaUnit = "marla" | "kanal" | "sqft" | "sqm";

export type VisitStatus = "pending" | "confirmed" | "reschedule_requested" | "completed" | "cancelled" | "declined";

export interface Profile {
  id: string;
  email: string;
  role: Role;
  full_name: string | null;
  avatar_url: string | null;
  verification_status: VerificationStatus;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

export interface PublicProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  verification_status: VerificationStatus;
  created_at: string;
}

export interface Property {
  id: string;
  owner_id: string;
  listing_type: ListingType;
  property_type: PropertyType;
  title: string;
  description: string;
  price: number;
  price_unit: PricePerUnit;
  city: string;
  area: string;
  address: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area_size: number | null;
  area_unit: PropertyAreaUnit | null;
  furnished: boolean | null;
  amenities: string[];
  images: string[];
  video_url: string | null;
  status: PropertyStatus;
  verification_status: VerificationStatus;
  views_count: number;
  favorites_count: number;
  contact_name: string | null;
  contact_phone: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  slug: string | null;
}

export interface PropertyWithOwner extends Property {
  owner?: PublicProfile;
}

export interface Favorite {
  id: string;
  user_id: string;
  property_id: string;
  created_at: string;
}

export interface VisitRequest {
  id: string;
  property_id: string;
  requester_id: string;
  visit_date: string;
  visit_time: string;
  guests: number;
  message: string | null;
  status: VisitStatus;
  created_at: string;
  updated_at: string;
}

export interface VisitRequestWithDetails extends VisitRequest {
  property?: PropertyWithOwner;
  requester?: PublicProfile;
  owner?: PublicProfile;
}

export interface Conversation {
  id: string;
  property_id: string;
  user_one_id: string;
  user_two_id: string;
  last_message_at: string | null;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
}

export interface Report {
  id: string;
  reporter_id: string;
  target_type: "property" | "user";
  target_id: string;
  reason: string;
  details: string | null;
  status: "open" | "under_review" | "resolved" | "dismissed";
  created_at: string;
  updated_at: string;
}

export interface CityArea {
  city: string;
  areas: string[];
}

// TODO: implement saved searches
export interface SavedSearch {
  id: string;
  user_id: string;
  name: string | null;
  filters: Record<string, unknown>;
  created_at: string;
}