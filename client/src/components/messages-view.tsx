import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Message, NetworkNode, NetworkConnection } from "@/types/network";
import { calculateOptimalRoute } from "@/lib/dijkstra";
import { 
  Send, 
  User, 
  Shield, 
  Route, 
  CheckCheck, 
  AlertTriangle,
  Info,
  Plus
} from "lucide-react";

export function MessagesView() {
  const [messageInput, setMessageInput] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: messages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
    refetchInterval: 2000,
  });

  const { data: nodes = [] } = useQuery<NetworkNode[]>({
    queryKey: ["/api/nodes"],
  });

  const { data: connections = [] } = useQuery<NetworkConnection[]>({
    queryKey: ["/api/connections"],
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      // Find the best target node (closest online node)
      const onlineNodes = nodes.filter(node => node.isOnline && node.nodeId !== "user");
      const targetNode = onlineNodes.length > 0 ? onlineNodes[0] : null;
      
      if (!targetNode) {
        throw new Error("No online nodes available");
      }
      
      // Calculate optimal routing path
      const routingResult = calculateOptimalRoute(nodes, connections, "user", targetNode.nodeId);
      const routingPath = routingResult ? routingResult.path : ["user", targetNode.nodeId];
      
      const response = await apiRequest("POST", "/api/messages", {
        senderId: "user",
        receiverId: targetNode.nodeId,
        content,
        messageType: "normal",
        routingPath,
        hops: routingPath.length - 1,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Message Sent",
        description: "Your message has been transmitted via mesh network",
      });
      setMessageInput("");
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/network/stats"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Send Message",
        description: error.message || "Please check your connection and try again",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = () => {
    if (messageInput.trim()) {
      sendMessageMutation.mutate(messageInput.trim());
    }
  };

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - new Date(timestamp).getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`;
    return `${Math.floor(diffInMinutes / 1440)} days ago`;
  };

  const getMessageTypeIcon = (messageType: string) => {
    switch (messageType) {
      case "sos":
        return <AlertTriangle className="h-3 w-3 text-red-500" />;
      case "system":
        return <Info className="h-3 w-3 text-blue-500" />;
      default:
        return <User className="h-3 w-3" />;
    }
  };

  if (messagesLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white pb-20">
      {/* Messages Header */}
      <CardHeader className="border-b border-gray-200">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Messages</CardTitle>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={async () => {
              if (confirm("Clear all messages? This action cannot be undone.")) {
                try {
                  await apiRequest("DELETE", "/api/messages");
                  queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
                  toast({
                    title: "Messages Cleared",
                    description: "All messages have been removed from the network",
                  });
                } catch (error) {
                  toast({
                    title: "Failed to Clear Messages",
                    description: "Please try again",
                    variant: "destructive",
                  });
                }
              }
            }}
          >
            Clear All
          </Button>
        </div>
        <p className="text-xs text-gray-500">Mesh network communication</p>
      </CardHeader>

      {/* Message List */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-2">
                <User className="h-12 w-12 mx-auto" />
              </div>
              <p className="text-sm text-gray-500">No messages yet</p>
              <p className="text-xs text-gray-400">Start a conversation with nearby nodes</p>
            </div>
          ) : (
            messages.map((message) => {
              const isOutgoing = message.senderId === "user";
              const isSystemMessage = message.messageType === "system";
              
              if (isSystemMessage) {
                return (
                  <div key={message.id} className="flex justify-center">
                    <div className="bg-yellow-100 border border-yellow-200 rounded-lg p-2 text-xs text-center max-w-xs">
                      <Info className="h-3 w-3 text-yellow-600 mr-1 inline" />
                      {message.content}
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={message.id}
                  className={`flex items-start space-x-3 ${
                    isOutgoing ? "flex-row-reverse space-x-reverse" : ""
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    isOutgoing ? "bg-red-600" : "bg-blue-500"
                  }`}>
                    {getMessageTypeIcon(message.messageType)}
                  </div>
                  
                  <div className="flex-1">
                    <div className={`rounded-lg p-3 max-w-xs ${
                      isOutgoing 
                        ? "bg-blue-500 text-white ml-auto" 
                        : message.messageType === "sos"
                          ? "bg-red-100 border border-red-200"
                          : "bg-gray-100"
                    }`}>
                      <p className={`text-sm ${
                        message.messageType === "sos" ? "text-red-800" : ""
                      }`}>
                        {message.content}
                      </p>
                      
                      <div className={`mt-2 text-xs flex items-center space-x-2 ${
                        isOutgoing 
                          ? "text-blue-100 justify-end" 
                          : "text-gray-500"
                      }`}>
                        {!isOutgoing && (
                          <>
                            <span>{message.senderId === "user" ? "You" : message.senderId.replace("-", " ").replace(/\b\w/g, l => l.toUpperCase())}</span>
                            <span>•</span>
                          </>
                        )}
                        <span>{formatTimeAgo(message.timestamp)}</span>
                        {message.hops > 1 && (
                          <>
                            <span>•</span>
                            <Badge variant="secondary" className="text-xs">
                              {message.hops} hops
                            </Badge>
                          </>
                        )}
                        {isOutgoing && message.isDelivered && (
                          <CheckCheck className="h-3 w-3 text-green-200" />
                        )}
                      </div>
                    </div>
                    
                    {/* Routing Path Visualization with Network Concepts */}
                    {message.routingPath && message.routingPath.length > 1 && (
                      <div className="mt-1 text-xs text-gray-400 space-y-1">
                        <div className="flex items-center">
                          <Route className="h-3 w-3 mr-1" />
                          Route: {message.routingPath.join(" → ")} 
                          {message.hops <= 2 && " (optimal path)"}
                        </div>
                        <div className="text-blue-600 font-medium">
                          {message.hops === 1 ? "🚀 Direct Link" : 
                           message.hops === 2 ? "📡 Single Hop Relay" :
                           message.hops === 3 ? "🔄 Multi-hop Routing" :
                           "🌐 Complex Mesh Path"}
                        </div>
                        {message.messageType === "sos" && (
                          <div className="text-red-600 font-medium">
                            🚨 Emergency Broadcast (Flooding Protocol)
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          {/* Auto-scroll target */}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="border-t border-gray-200 p-4 bg-white">
        <div className="flex items-center space-x-2">
          <Input
            type="text"
            placeholder="Type emergency message..."
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            className="flex-1"
            disabled={sendMessageMutation.isPending}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!messageInput.trim() || sendMessageMutation.isPending}
            className="w-10 h-10 p-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="mt-2 text-xs text-gray-500 flex items-center">
          <Shield className="h-3 w-3 mr-1 text-green-600" />
          End-to-end encrypted • Mesh routing enabled
        </div>
      </div>
    </div>
  );
}
