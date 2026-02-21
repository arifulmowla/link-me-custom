import { HomePageShell } from "@/app/components/home/HomePageShell";

export default function Home() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "urlsy.co",
    url: "https://urlsy.co",
    description:
      "urlsy.co helps you create short links fast with clean analytics and premium features when you grow.",
    publisher: {
      "@type": "Organization",
      name: "urlsy.co",
      url: "https://urlsy.co",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomePageShell />
    </>
  );
}
