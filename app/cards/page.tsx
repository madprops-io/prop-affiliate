import { redirect } from "next/navigation";

type Props = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default function CardsPage({ searchParams }: Props) {
  const params = new URLSearchParams();

  Object.entries(searchParams ?? {}).forEach(([key, value]) => {
    if (value == null) return;
    if (Array.isArray(value)) {
      value.forEach((v) => params.append(key, v));
      return;
    }
    params.set(key, value);
  });

  // Force the cards view flag while preserving any other query params (sort, filters).
  params.set("view", "cards");

  const query = params.toString();
  redirect(`/${query ? `?${query}` : ""}`);
}
