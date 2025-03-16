/**
 * Subscription service mappings for standardized colors and logos
 */
export interface SubscriptionMapping {
  name: string;
  variants: string[]; // Different ways the service might be named
  color: string;
  logo: string;
}

export const subscriptionMappings: SubscriptionMapping[] = [
  {
    name: "Netflix",
    variants: [
      "netflix",
      "netflix premium",
      "netflix basic",
      "netflix standard",
    ],
    color: "#E50914",
    logo: "netflix.svg",
  },
  {
    name: "Spotify",
    variants: [
      "spotify",
      "spotify premium",
      "spotify family",
      "spotify duo",
      "spotify student",
    ],
    color: "#1DB954",
    logo: "spotify.svg",
  },
  {
    name: "Amazon Prime",
    variants: ["amazon prime", "prime", "amazon", "prime video"],
    color: "#00A8E1",
    logo: "amazon-prime.svg",
  },
  {
    name: "Disney+",
    variants: ["disney+", "disney plus", "disney"],
    color: "#0063E5",
    logo: "disney-plus.svg",
  },
  {
    name: "YouTube Premium",
    variants: ["youtube premium", "youtube", "yt premium", "youtube music"],
    color: "#FF0000",
    logo: "youtube.svg",
  },
  {
    name: "Apple Music",
    variants: ["apple music", "apple music family", "apple music student", "apple tv"],
    color: "#FA243C",
    logo: "apple-music.svg",
  },
  {
    name: "Xbox Game Pass",
    variants: ["xbox game pass", "game pass", "xbox", "xbox live"],
    color: "#107C10",
    logo: "xbox.svg",
  },
  {
    name: "PlayStation Plus",
    variants: ["playstation plus", "ps plus", "ps+", "playstation"],
    color: "#0070D1",
    logo: "playstation.svg",
  },
  {
    name: "Adobe Creative Cloud",
    variants: ["adobe", "adobe cc", "creative cloud", "adobe creative cloud"],
    color: "#FF0000",
    logo: "adobe.svg",
  },
  {
    name: "Microsoft 365",
    variants: ["microsoft 365", "office 365", "microsoft office", "office"],
    color: "#D83B01",
    logo: "microsoft-365.svg",
  },
  {
    name: "iCloud",
    variants: ["icloud", "apple icloud", "icloud storage"],
    color: "#3395FF",
    logo: "icloud.svg",
  },
  {
    name: "Google One",
    variants: ["google one", "google storage", "google drive storage"],
    color: "#4285F4",
    logo: "google-one.svg",
  },
  {
    name: "Dropbox",
    variants: ["dropbox", "dropbox plus", "dropbox professional"],
    color: "#0061FF",
    logo: "dropbox.svg",
  },
  {
    name: "HBO Max",
    variants: ["hbo max", "hbo", "hbomax"],
    color: "#5822B4",
    logo: "hbo-max.svg",
  },
  {
    name: "Hulu",
    variants: ["hulu", "hulu premium", "hulu no ads"],
    color: "#1CE783",
    logo: "hulu.svg",
  },
];

/**
 * Find a subscription mapping based on service name
 * @param serviceName - The name of the subscription service
 * @returns The matching subscription mapping or undefined if not found
 */
export const findSubscriptionMapping = (
  serviceName: string
): SubscriptionMapping | undefined => {
  if (!serviceName) {
    return undefined;
  }

  const normalizedName = serviceName.toLowerCase().trim();

  return subscriptionMappings.find(
    (mapping) =>
      mapping.name.toLowerCase() === normalizedName ||
      mapping.variants.some((variant) => variant === normalizedName)
  );
};
