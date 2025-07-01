import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Check } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface SOSButtonProps {
  userLocation: { latitude: number; longitude: number };
}

export function SOSButton({ userLocation }: SOSButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const sosMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/sos", {
        senderId: "user",
        location: userLocation,
        content: `Emergency SOS Alert! I need immediate assistance. My current location is ${userLocation.latitude.toFixed(6)}, ${userLocation.longitude.toFixed(6)}`,
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "SOS Alert Sent",
        description: `Emergency broadcast sent to ${data.recipientCount} nodes`,
        duration: 5000,
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/network/stats"] });
      
      setIsOpen(false);
    },
    onError: () => {
      toast({
        title: "Failed to Send SOS",
        description: "Please check your connection and try again",
        variant: "destructive",
      });
    },
  });

  const handleSOS = () => {
    sosMutation.mutate();
  };

  return (
    <>
      <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
        <AlertDialogTrigger asChild>
          <Button
            size="lg"
            className="w-16 h-16 bg-red-600 hover:bg-red-700 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 transform hover:scale-105 fixed bottom-32 right-4"
          >
            <AlertTriangle className="h-6 w-6 text-white" />
          </Button>
        </AlertDialogTrigger>
        
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-white" />
              </div>
            </div>
            <AlertDialogTitle className="text-center">Send Emergency Alert?</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              This will broadcast your location and emergency status to all connected nodes in the network.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <AlertDialogFooter className="flex flex-col space-y-2 sm:flex-col sm:space-x-0">
            <AlertDialogAction
              onClick={handleSOS}
              disabled={sosMutation.isPending}
              className="w-full bg-red-600 hover:bg-red-700 text-white"
            >
              {sosMutation.isPending ? (
                "Sending..."
              ) : (
                "Send SOS Alert"
              )}
            </AlertDialogAction>
            <AlertDialogCancel className="w-full">Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
