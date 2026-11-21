import { Button } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="py-16">
      <h1 className="font-display text-4xl">That page is not in the books</h1>
      <p className="mt-2 text-sm text-muted">The document may have been removed, or the link is old.</p>
      <div className="mt-5">
        <Button href="/">Back to the dashboard</Button>
      </div>
    </div>
  );
}
