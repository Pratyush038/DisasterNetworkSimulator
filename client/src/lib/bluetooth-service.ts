import type { NetworkNode } from "@/types/network";

export interface BluetoothDevice {
  id: string;
  name: string;
  rssi: number; // Signal strength
  distance: number; // Estimated distance in meters
  lastSeen: number;
}

export interface DiscoveredNode extends BluetoothDevice {
  nodeId: string;
  deviceType: "smartphone" | "tablet" | "emergency_beacon" | "relay_station";
  capabilities: string[];
}

export class BluetoothDiscoveryService {
  private isScanning = false;
  private scanInterval: number | null = null;
  private discoveredDevices: Map<string, DiscoveredNode> = new Map();
  private subscribers: Set<(devices: DiscoveredNode[]) => void> = new Set();

  constructor() {
    this.startBackgroundScanning();
  }

  async requestBluetoothPermission(): Promise<boolean> {
    try {
      // Check if Web Bluetooth API is available
      if (!(navigator as any).bluetooth) {
        console.warn('Web Bluetooth API not available');
        return false;
      }

      // Request device access (this would normally show a device picker)
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['battery_service', 'device_information']
      });

      return !!device;
    } catch (error) {
      console.warn('Bluetooth permission denied or error:', error);
      return false;
    }
  }

  startScanning(): void {
    if (this.isScanning) return;
    
    this.isScanning = true;
    console.log('🔍 Starting Bluetooth LE scan for nearby ResQNet nodes...');
    
    // Simulate scanning with realistic device discovery
    this.simulateDeviceDiscovery();
  }

  stopScanning(): void {
    this.isScanning = false;
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
    console.log('⏹️ Bluetooth scanning stopped');
  }

  private startBackgroundScanning(): void {
    // Start automatic scanning every 30 seconds
    setInterval(() => {
      if (!this.isScanning) {
        this.simulateDeviceDiscovery();
      }
    }, 30000);
  }

  private simulateDeviceDiscovery(): void {
    // Simulate realistic Bluetooth LE discovery with varying devices
    const simulatedDevices: DiscoveredNode[] = [
      {
        id: 'bt-001',
        nodeId: 'mobile-rescue-01',
        name: 'Emergency Responder Phone',
        rssi: -45,
        distance: 8,
        lastSeen: Date.now(),
        deviceType: 'smartphone',
        capabilities: ['messaging', 'gps', 'emergency_broadcast']
      },
      {
        id: 'bt-002', 
        nodeId: 'beacon-alpha',
        name: 'RV College Emergency Beacon',
        rssi: -35,
        distance: 5,
        lastSeen: Date.now(),
        deviceType: 'emergency_beacon',
        capabilities: ['emergency_broadcast', 'location_beacon', 'mesh_relay']
      },
      {
        id: 'bt-003',
        nodeId: 'relay-station-01',
        name: 'Mysore Road Relay Station',
        rssi: -55,
        distance: 15,
        lastSeen: Date.now(),
        deviceType: 'relay_station',
        capabilities: ['mesh_relay', 'long_range', 'power_backup']
      }
    ];

    // Randomly discover devices to simulate real scanning
    const discoveryChance = 0.7; // 70% chance to discover each device
    
    simulatedDevices.forEach(device => {
      if (Math.random() < discoveryChance) {
        // Add some realistic variation to signal strength
        const rssiVariation = (Math.random() - 0.5) * 10;
        device.rssi += rssiVariation;
        device.distance = this.calculateDistanceFromRSSI(device.rssi);
        
        this.discoveredDevices.set(device.id, device);
      }
    });

    // Occasionally simulate device disconnection
    const disconnectionChance = 0.1; // 10% chance
    this.discoveredDevices.forEach((device, id) => {
      if (Math.random() < disconnectionChance) {
        this.discoveredDevices.delete(id);
      }
    });

    this.notifySubscribers();
  }

  private calculateDistanceFromRSSI(rssi: number): number {
    // Approximate distance calculation from RSSI
    // Formula: Distance = 10^((Tx Power - RSSI) / (10 * n))
    // Where Tx Power ≈ -20 dBm and n ≈ 2 for free space
    const txPower = -20;
    const pathLossExponent = 2;
    const distance = Math.pow(10, (txPower - rssi) / (10 * pathLossExponent));
    return Math.max(1, Math.round(distance)); // Minimum 1 meter
  }

  getDiscoveredDevices(): DiscoveredNode[] {
    return Array.from(this.discoveredDevices.values())
      .filter(device => Date.now() - device.lastSeen < 60000) // Remove devices not seen in 1 minute
      .sort((a, b) => b.rssi - a.rssi); // Sort by signal strength
  }

  subscribe(callback: (devices: DiscoveredNode[]) => void): () => void {
    this.subscribers.add(callback);
    
    // Notify immediately with current devices
    callback(this.getDiscoveredDevices());
    
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private notifySubscribers(): void {
    const devices = this.getDiscoveredDevices();
    this.subscribers.forEach(callback => {
      try {
        callback(devices);
      } catch (error) {
        console.error('Error in Bluetooth discovery subscriber:', error);
      }
    });
  }

  async connectToDevice(deviceId: string): Promise<boolean> {
    const device = this.discoveredDevices.get(deviceId);
    if (!device) {
      console.error('Device not found:', deviceId);
      return false;
    }

    try {
      console.log(`🔗 Attempting to connect to ${device.name}...`);
      
      // Simulate connection attempt
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (Math.random() > 0.2) { // 80% success rate
        console.log(`✅ Successfully connected to ${device.name}`);
        return true;
      } else {
        console.log(`❌ Failed to connect to ${device.name}`);
        return false;
      }
    } catch (error) {
      console.error('Connection error:', error);
      return false;
    }
  }

  getDeviceCapabilities(deviceId: string): string[] {
    const device = this.discoveredDevices.get(deviceId);
    return device?.capabilities || [];
  }

  isBluetoothSupported(): boolean {
    return 'bluetooth' in (navigator as any);
  }

  cleanup(): void {
    this.stopScanning();
    this.discoveredDevices.clear();
    this.subscribers.clear();
  }
}

export const bluetoothService = new BluetoothDiscoveryService();