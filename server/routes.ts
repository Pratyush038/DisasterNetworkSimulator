import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMessageSchema, insertNetworkNodeSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Network nodes routes
  app.get("/api/nodes", async (req, res) => {
    try {
      const nodes = await storage.getAllNodes();
      res.json(nodes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch nodes" });
    }
  });

  app.get("/api/nodes/:nodeId", async (req, res) => {
    try {
      const node = await storage.getNode(req.params.nodeId);
      if (!node) {
        return res.status(404).json({ message: "Node not found" });
      }
      res.json(node);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch node" });
    }
  });

  app.post("/api/nodes", async (req, res) => {
    try {
      const nodeData = insertNetworkNodeSchema.parse(req.body);
      const node = await storage.createNode(nodeData);
      res.status(201).json(node);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid node data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create node" });
    }
  });

  app.patch("/api/nodes/:nodeId/status", async (req, res) => {
    try {
      const { isOnline, signalStrength } = req.body;
      await storage.updateNodeStatus(req.params.nodeId, isOnline, signalStrength);
      res.json({ message: "Node status updated" });
    } catch (error) {
      res.status(500).json({ message: "Failed to update node status" });
    }
  });

  // Network connections routes
  app.get("/api/connections", async (req, res) => {
    try {
      const connections = await storage.getAllConnections();
      res.json(connections);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch connections" });
    }
  });

  app.get("/api/connections/:nodeId", async (req, res) => {
    try {
      const connections = await storage.getConnectionsForNode(req.params.nodeId);
      res.json(connections);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch node connections" });
    }
  });

  // Messages routes
  app.get("/api/messages", async (req, res) => {
    try {
      const messages = await storage.getAllMessages();
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.get("/api/messages/:nodeId", async (req, res) => {
    try {
      const messages = await storage.getMessagesByNode(req.params.nodeId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch node messages" });
    }
  });

  app.post("/api/messages", async (req, res) => {
    try {
      const messageData = insertMessageSchema.parse(req.body);
      const message = await storage.createMessage(messageData);
      res.status(201).json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid message data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  app.patch("/api/messages/:messageId/delivered", async (req, res) => {
    try {
      await storage.markMessageDelivered(parseInt(req.params.messageId));
      res.json({ message: "Message marked as delivered" });
    } catch (error) {
      res.status(500).json({ message: "Failed to update message status" });
    }
  });

  app.delete("/api/messages", async (req, res) => {
    try {
      await storage.clearAllMessages();
      res.json({ message: "All messages cleared successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to clear messages" });
    }
  });

  // SOS broadcast endpoint
  app.post("/api/sos", async (req, res) => {
    try {
      const { senderId, location, content } = req.body;
      
      // Get all online nodes for broadcasting
      const nodes = await storage.getAllNodes();
      const onlineNodes = nodes.filter(node => node.isOnline && node.nodeId !== senderId);
      
      // Create SOS message for each online node
      const sosMessages = await Promise.all(
        onlineNodes.map(node => 
          storage.createMessage({
            senderId,
            receiverId: node.nodeId,
            content: content || `SOS Alert from ${senderId}. Location: ${location.latitude}, ${location.longitude}`,
            messageType: "sos",
            routingPath: [senderId, node.nodeId],
            hops: 1,
          })
        )
      );

      res.json({ 
        message: "SOS broadcast sent", 
        recipientCount: onlineNodes.length,
        messages: sosMessages 
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to broadcast SOS" });
    }
  });

  // Network statistics endpoint
  app.get("/api/network/stats", async (req, res) => {
    try {
      const nodes = await storage.getAllNodes();
      const connections = await storage.getAllConnections();
      const messages = await storage.getAllMessages();
      
      const onlineNodes = nodes.filter(node => node.isOnline);
      const activeConnections = connections.filter(conn => conn.isActive);
      const averageLatency = activeConnections.length > 0 
        ? Math.round(activeConnections.reduce((sum, conn) => sum + conn.latency, 0) / activeConnections.length)
        : 0;
      
      // Calculate coverage radius (max distance from user node)
      const userConnections = activeConnections.filter(conn => 
        conn.fromNodeId === "user" || conn.toNodeId === "user"
      );
      const maxDistance = userConnections.length > 0 
        ? Math.max(...userConnections.map(conn => conn.distance))
        : 0;

      res.json({
        connectedNodes: onlineNodes.length,
        totalNodes: nodes.length,
        activeConnections: activeConnections.length,
        averageLatency,
        coverageRadius: maxDistance,
        totalMessages: messages.length,
        unreadMessages: messages.filter(msg => !msg.isDelivered && msg.receiverId === "user").length,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch network statistics" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
