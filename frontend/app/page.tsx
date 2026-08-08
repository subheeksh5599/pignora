import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Landmark, ShieldCheck, ScrollText, Wallet } from "lucide-react";
import { siteConfig } from "@/lib/metadata";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: siteConfig.name,
  description: siteConfig.description,
};

const STEPS = [
  {
    icon: ShieldCheck,
    title: "Verify",
    body: "Cleanverse A-Pass tier is read on-chain. Unverified wallets cannot borrow.",
  },
  {
    icon: Wallet,
    title: "Price",
    body: "The tier sets the lending cap: 2%, 5%, or 10% haircut. Same bond, different terms.",
  },
  {
    icon: Landmark,
    title: "Escrow",
    body: "Collateral and aUSDC lock in the RepoDesk until repayment, 105% margin on-chain.",
  },
  {
    icon: ScrollText,
    title: "Close",
    body: "A credential event mid-term flips the gate and settles the repo in defined numbers.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen">
      {/* hero */}
      <section className="relative overflow-hidden border-b bg-background">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,oklch(0.97_0.005_160/0.6),transparent_55%)]" aria-hidden="true" />
        <div className="relative mx-auto max-w-6xl px-6 py-24 md:py-32">
          <Badge variant="outline" className="mb-6">Cleanverse Build · Trusted Assets</Badge>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight md:text-6xl">
            The repo desk that closes out when trust does.
          </h1>
          <p className="mt-6 max-w-xl text-base text-muted-foreground md:text-lg">
            Pignora is a compliant repo rail for tokenized assets on Monad.
            Your Cleanverse A-Pass tier prices the lending cap, and a
            credential event mid-term triggers a defined, on-chain closeout.
            No freeze-and-hope.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" render={<Link href="/dashboard" />}>
              Open the desk <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" render={<Link href="https://pignora-five.vercel.app" />}>
              See the 3D landing
            </Button>
          </div>
          <dl className="mt-14 grid max-w-2xl grid-cols-2 gap-x-8 gap-y-6 text-sm sm:grid-cols-4">
            {[
              ["Chain", "Monad testnet"],
              ["Identity rail", "Cleanverse CVI · CVA"],
              ["Cash leg", "aUSDC"],
              ["Margins", "105% maintenance"],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-muted-foreground">{k}</dt>
                <dd className="mt-1 font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* steps */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-4 md:grid-cols-4">
          {STEPS.map((step, i) => (
            <Card key={step.title} className="border-border/60">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <step.icon className="h-5 w-5 text-foreground" />
                  <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
                </div>
                <h2 className="mt-4 font-semibold">{step.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
