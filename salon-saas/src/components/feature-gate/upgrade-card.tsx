"use client";
import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";

export function UpgradeCard({ featureName }: { featureName: string }) {
  return (
    <Card className="max-w-md mx-auto mt-10">
      <CardHeader className="flex flex-col items-center text-center">
        <div className="p-3 bg-muted rounded-full mb-2">
          <Lock className="h-8 w-8 text-primary" />
        </div>
        <CardTitle>Feature Locked</CardTitle>
        <CardDescription>
          Upgrade your plan to unlock the <strong>{featureName}</strong> feature.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center">
        <Button onClick={() => alert("Please contact support at billing@yourplatform.com to upgrade your plan!")}>
          Contact Support to Upgrade
        </Button>
      </CardContent>
    </Card>
  );
}
