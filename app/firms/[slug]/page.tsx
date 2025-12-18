import { redirect } from "next/navigation";

type FirmSlugPageProps = {
  params: { slug: string };
};

export default function FirmSlugPage({ params }: FirmSlugPageProps) {
  const { slug } = params;
  redirect(`/firm/${slug}`);
}
