import { Card } from "@/components/Card";
import { LinkButton } from "@/components/LinkButton";

const STEPS = [
  {
    title: "Describe the role",
    body: "Paste a job description, the company URL, and how many days you have to prepare.",
  },
  {
    title: "We build your kit",
    body: "TestDino researches the company and generates tailored questions and flashcards.",
  },
  {
    title: "Practice with a plan",
    body: "Work through a day-by-day schedule that focuses your time where it matters.",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col items-start gap-5">
        <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-700">
          Interview preparation, tailored
        </span>
        <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          Turn a job description into a focused interview prep kit
        </h1>
        <p className="max-w-2xl text-base text-slate-600">
          TestDino generates role-specific questions, flashcards, and a study
          schedule so you can walk into your interview prepared.
        </p>
        <div className="flex flex-wrap gap-3">
          <LinkButton href="/kits/new">Create a kit</LinkButton>
          <LinkButton href="/kits" variant="secondary">
            View my kits
          </LinkButton>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {STEPS.map((step, index) => (
          <Card key={step.title}>
            <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-md bg-slate-900 text-sm font-semibold text-white">
              {index + 1}
            </div>
            <h2 className="text-sm font-semibold text-slate-900">{step.title}</h2>
            <p className="mt-1 text-sm text-slate-600">{step.body}</p>
          </Card>
        ))}
      </section>
    </div>
  );
}
