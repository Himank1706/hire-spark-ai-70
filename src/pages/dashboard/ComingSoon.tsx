import { Card } from "@/components/ui/card";
import { Construction } from "lucide-react";

export const ComingSoon = ({ title, desc }: { title: string; desc: string }) => (
  <div className="p-6 md:p-10 max-w-4xl mx-auto">
    <h1 className="font-display text-3xl md:text-4xl font-bold">{title}</h1>
    <p className="text-muted-foreground mt-2">{desc}</p>
    <Card className="mt-8 p-12 text-center border-dashed">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full gradient-accent text-secondary mb-4">
        <Construction className="h-6 w-6" />
      </div>
      <p className="font-display text-lg font-semibold">In active development</p>
      <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
        This module ships next. Run a Resume Analysis first — its output will power Jobs, Learning, and Enhancements.
      </p>
    </Card>
  </div>
);
