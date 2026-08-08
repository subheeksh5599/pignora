import type { Metadata } from "next";

export const siteConfig = {
  name: "Pignora — Compliant RWA repo rail on Monad",
  description:
    "Tokenized assets repo'd for aUSDC cash, with haircuts priced by Cleanverse verified identity and automatic compliant closeout on credential events. Built for Cleanverse Build: Trusted Assets.",
  url: "https://reporeal.dev",
  creator: "@pignora",
  authors: [
    {
      name: "Pignora",
      url: "https://reporeal.dev",
    },
  ],
  keywords: [
    "repo",
    "RWA",
    "Cleanverse",
    "CVI",
    "CVA",
    "Monad",
    "compliance",
    "verified identity",
    "travel rule",
    "aUSDC",
  ],
} as const;

export const baseMetadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [...siteConfig.keywords],
  authors: [...siteConfig.authors],
  creator: siteConfig.creator,
  publisher: siteConfig.name,
  robots: {
    index: true,
    follow: true,
  },
};

export function createMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description?: string;
  path: string;
}): Metadata {
  return {
    ...baseMetadata,
    title,
    description: description ?? siteConfig.description,
    alternates: {
      canonical: `${siteConfig.url}${path}`,
    },
    openGraph: {
      ...baseMetadata.openGraph,
      title,
      description: description ?? siteConfig.description,
      url: `${siteConfig.url}${path}`,
    },
  };
}
