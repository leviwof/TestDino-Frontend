import { PracticeModeView } from "@/components/PracticeModeView";
import { PageHeader } from "@/components/PageHeader";
import { LinkButton } from "@/components/LinkButton";

interface PracticePageProps {
  params: { id: string };
}

export default function PracticePage({ params }: PracticePageProps) {
  return (
    <div>
      <PageHeader
        title="Practice Mode"
        description="Active recall practice ordered by confidence priority."
        action={
          <LinkButton href={`/kits/${params.id}`} variant="secondary">
            ← Return to kit details
          </LinkButton>
        }
      />
      <PracticeModeView kitId={params.id} />
    </div>
  );
}
