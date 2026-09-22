import { BatchUploadForm } from "@/components/BatchUploadForm";
import { Card } from "@/components/Card";
import { LinkButton } from "@/components/LinkButton";
import { PageHeader } from "@/components/PageHeader";
import { RequireAuth } from "@/components/RequireAuth";

export default function BatchKitsPage() {
  return (
    <div>
      <PageHeader
        title="Batch create kits"
        description="Prepare for several roles at once by uploading a file of description-and-company pairs."
        action={
          <LinkButton href="/kits/new" variant="secondary">
            Single kit
          </LinkButton>
        }
      />

      <RequireAuth>
        <Card>
          <BatchUploadForm />
        </Card>
      </RequireAuth>
    </div>
  );
}
