import { Card } from "@/components/Card";
import { LinkButton } from "@/components/LinkButton";
import { NewKitForm } from "@/components/NewKitForm";
import { PageHeader } from "@/components/PageHeader";
import { RequireAuth } from "@/components/RequireAuth";

export default function NewKitPage() {
  return (
    <div>
      <PageHeader
        title="New Kit"
        description="Tell us about the role and we'll build a tailored prep kit."
        action={
          <LinkButton href="/kits" variant="secondary">
            Back to kits
          </LinkButton>
        }
      />

      <RequireAuth>
        <Card>
          <NewKitForm />
        </Card>
      </RequireAuth>
    </div>
  );
}
