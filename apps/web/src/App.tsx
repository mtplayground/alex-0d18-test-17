import type { HealthResponse } from "@myclawteam/shared";

const healthExample: HealthResponse = {
  status: "ok",
  service: "myClawTeam API"
};

export function App() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-12">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
            File sharing workspace
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-normal sm:text-5xl">
            myClawTeam
          </h1>
          <p className="mt-5 text-lg leading-8 text-slate-700">
            Upload, share, and retrieve files through short links. The upload
            workflow and storage-backed downloads will be added in the next
            implementation issues.
          </p>
        </div>

        <dl className="mt-10 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <dt className="text-sm font-medium text-slate-500">Frontend</dt>
            <dd className="mt-2 text-base font-semibold">React + Tailwind</dd>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <dt className="text-sm font-medium text-slate-500">Backend</dt>
            <dd className="mt-2 text-base font-semibold">Express API</dd>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <dt className="text-sm font-medium text-slate-500">Health shape</dt>
            <dd className="mt-2 text-base font-semibold">{healthExample.status}</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
