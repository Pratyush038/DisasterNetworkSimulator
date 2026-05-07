import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, MapPin, Radio, Users } from "lucide-react";

export function EmergencyActionsCard() {
  return (
    <Card className="rounded-lg border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-base text-slate-950">
          <AlertTriangle className="mr-2 h-4 w-4 text-amber-600" />
          Emergency Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2">
        <Button variant="outline" className="h-11 justify-start">
          <Users className="mr-3 h-4 w-4" />
          Find Nearby Survivors
        </Button>
        <Button variant="outline" className="h-11 justify-start">
          <Radio className="mr-3 h-4 w-4" />
          Broadcast Location
        </Button>
        <Button variant="outline" className="h-11 justify-start">
          <MapPin className="mr-3 h-4 w-4" />
          Emergency Contacts
        </Button>
      </CardContent>
    </Card>
  );
}
