import type {
  CityArea,
  ListingType,
  PricePerUnit,
  PropertyAreaUnit,
  PropertyStatus,
  PropertyType,
  VerificationStatus,
  VisitStatus,
} from "@/types";

export const cities: CityArea[] = [
  { city: "Lahore", areas: ["DHA", "Gulberg", "Model Town", "Johar Town", "Bahria Town", "Cantt", "Wapda Town", "Iqbal Town", "Valencia", "Lakshmi Chowk", "Faisal Town", "Garden Town", "Allama Iqbal Town"] },
  { city: "Karachi", areas: ["DHA", "Clifton", "Gulshan-e-Iqbal", "Gulistan-e-Johar", "Bahria Town", "Defence Phase 1-8", "North Nazimabad", "PECHS", "Nazimabad", "Saddar", "Scheme 33", "Korangi", "Malir"] },
  { city: "Islamabad", areas: ["F-7", "F-8", "F-10", "G-9", "G-10", "G-11", "E-11", "DHA Islamabad", "Bahria Town", "Gulberg Greens", "Gulberg Residencia", "Blue Area", "Bani Gala", "Sector I-8"] },
  { city: "Rawalpindi", areas: ["Bahria Town", "DHA", "Satellite Town", "Gulraiz", "Westridge", "Chaklala", "Airport Housing Society", "Askari", "PWD", "Lalasani"] },
  { city: "Faisalabad", areas: ["D Ground", "Peoples Colony", "Madina Town", "Jinnah Colony", "Gulberg", "Kohinoor City", "Wapda Town", "Satiana Road", "Narang Mandi"] },
  { city: "Multan", areas: ["Gulgasht Colony", "Shah Rukn-e-Alam", "Model Town", "Bosan Road", "Cantt", "New Multan", "Jalalpur Pirwala"] },
  { city: "Peshawar", areas: ["University Town", "Hayatabad", "DHA Peshawar", "Phase 3", "Phase 5", "City", "Shabqadar", "Charsadda Road"] },
  { city: "Sialkot", areas: ["Cantt", "Zafarwal Road", "Model Town", "Al-Faisal Town", "Iqbal Town", "Daska Road"] },
  { city: "Gujranwala", areas: ["Satellite Town", "Model Town", "Cantt", "G.T. Road", "Wazirabad Road", "Eminabad Road"] },
  { city: "Quetta", areas: ["Jinnah Town", "Samungli", "Cantt", "Satellite Town", "Airport Road", "Zarghoon Road"] },
  { city: "Bahawalpur", areas: ["Model Town", "Cantt", "Farid Gate", "Al-Abbas Town", "Multan Road"] },
  { city: "Hyderabad", areas: ["Qasimabad", "Latifabad", "Unit No. 2", "Saddar", "Tando Jam", "City"] },
  { city: "Abbottabad", areas: ["Supreme City", "Cantt", "Old City", "Mandi", "Jhangi"] },
  { city: "Murree", areas: ["Mall Road", "Bun", "Kashmir Point", "GPO", "Lower Topa"] },
];

export const cityNames = cities.map((c) => c.city);

export const allAreas = [...new Set(cities.flatMap((c) => c.areas))];

export const propertyTypeLabels: Record<PropertyType, string> = {
  house: "House",
  apartment: "Apartment / Flat",
  portion: "Portion",
  room: "Room / Basement",
  plot: "Plot / Land",
  shop: "Shop",
  office: "Office",
  warehouse: "Warehouse / Factory",
};

export const listingTypeLabels: Record<ListingType, string> = {
  rent: "For Rent",
  sale: "For Sale",
};

export const propertyTypesByListing: Record<ListingType, PropertyType[]> = {
  rent: ["house", "apartment", "portion", "room"],
  sale: ["house", "apartment", "portion", "plot"],
};

export const priceUnitLabels: Record<PricePerUnit, string> = {
  monthly: "/ month",
  yearly: "/ year",
  total: "",
};

export const areaUnits: { value: PropertyAreaUnit; label: string }[] = [
  { value: "marla", label: "Marla" },
  { value: "kanal", label: "Kanal" },
  { value: "sqft", label: "Square Feet" },
  { value: "sqm", label: "Square Meters" },
];

export const amenityOptions = [
  "Air Conditioning",
  "Furnished",
  "Parking",
  "Backup Generator",
  "Security Staff",
  "Elevator / Lift",
  "Swimming Pool",
  "Gym",
  "Garden / Lawn",
  "Balcony",
  "Gas",
  "Water Supply",
  "Wifi / Internet",
  "CCTV",
  "Kitchen Appliances",
  "Pets Allowed",
  "Wheelchair Access",
  "Sewage & Drainage",
];

export const reportReasons = [
  "Fraud / Scam",
  "Misleading information",
  "Duplicate listing",
  "False pricing",
  "Property no longer available",
  "Inappropriate content",
  "Harassment",
  "Other",
];

export const verificationBadgeLabel: Record<VerificationStatus, string> = {
  unverified: "Unverified",
  pending: "Verification pending",
  verified: "Verified",
  rejected: "Verification rejected",
  suspended: "Suspended",
};

export const visitStatusLabels: Record<VisitStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  reschedule_requested: "Reschedule requested",
  completed: "Completed",
  cancelled: "Cancelled",
  declined: "Declined",
};

export const visitStatusTone: Record<VisitStatus, "gray" | "blue" | "green" | "amber" | "red"> = {
  pending: "amber",
  confirmed: "green",
  reschedule_requested: "blue",
  completed: "gray",
  cancelled: "red",
  declined: "red",
};

export const propertyStatusLabels: Record<PropertyStatus, string> = {
  draft: "Draft",
  pending: "Pending review",
  active: "Active",
  paused: "Paused",
  sold: "Sold",
  rented: "Rented",
  expired: "Expired",
  rejected: "Rejected",
  suspended: "Suspended",
};

export const propertyStatusTone: Record<PropertyStatus, "gray" | "green" | "amber" | "blue" | "red"> = {
  draft: "gray",
  pending: "amber",
  active: "green",
  paused: "amber",
  sold: "blue",
  rented: "blue",
  expired: "gray",
  rejected: "red",
  suspended: "red",
};