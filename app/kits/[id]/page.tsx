import { KitDetailsView } from "@/components/KitDetailsView";
import { LinkButton } from "@/components/LinkButton";
import { PageHeader } from "@/components/PageHeader";

interface KitDetailsPageProps {
  params: { id: string };
}

export default function KitDetailsPage({ params }: KitDetailsPageProps) {
  return (
    <div>
      <PageHeader
        title="Kit details"
        description="Your interview preparation kit."
        action={
          <LinkButton href="/kits" variant="secondary">
            Back to kits
          </LinkButton>
        }
      />
      <KitDetailsView kitId={params.id} />
    </div>
  );
}
