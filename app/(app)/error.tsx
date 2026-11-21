"use client";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const offline = /Mongo|ECONNREFUSED|buffering timed out|Server selection|connect/i.test(error.message);
  return (
    <div className="mx-auto max-w-xl py-16">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass">Safar Books</div>
      <h1 className="mt-2 font-display text-4xl">{offline ? "MongoDB is not running" : "The books could not be opened"}</h1>
      <p className="mt-3 text-sm text-muted">{error.message}</p>
      {offline && (
        <pre className="mt-4 overflow-x-auto rounded-xl bg-pine p-4 text-xs text-sand">{`mkdir -p .mongo-data
mongod --dbpath .mongo-data --port 27017 --bind_ip 127.0.0.1`}</pre>
      )}
      <button onClick={reset} className="mt-5 rounded-md bg-brass px-4 py-2 text-sm font-semibold text-white">
        Try again
      </button>
    </div>
  );
}
