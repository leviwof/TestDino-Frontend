import { JobProgress } from "@/components/JobProgress";
import { LinkButton } from "@/components/LinkButton";
import { PageHeader } from "@/components/PageHeader";

interface JobPageProps {
  params: { id: string };
}

export default function JobPage({ params }: JobPageProps) {
  return (
    <div>
      <PageHeader
        title="Building your kit"
        description="We'll take you to your kit as soon as it's ready."
        action={
          <LinkButton href="/kits" variant="secondary">
            Back to kits
          </LinkButton>
        }
      />
      <JobProgress jobId={params.id} />
    </div>
  );
}
