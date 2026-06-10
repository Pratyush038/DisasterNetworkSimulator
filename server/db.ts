import * as schema from "@shared/schema";

// Mock database for development
console.log('Using mock database for development');

type MockRow = Record<string, any>;

// In-memory data storage
const mockData = {
  nodes: [
    {
      id: 1,
      nodeId: "user",
      name: "You (RV College)",
      latitude: 12.9249,
      longitude: 77.4996,
      isOnline: true,
      signalStrength: 100,
      lastSeen: new Date()
    },
    {
      id: 2,
      nodeId: "rv-gate",
      name: "RV Gate Station",
      latitude: 12.9258,
      longitude: 77.4988,
      isOnline: true,
      signalStrength: 95,
      lastSeen: new Date()
    },
    {
      id: 3,
      nodeId: "mysore-road",
      name: "Mysore Road Junction",
      latitude: 12.9240,
      longitude: 77.4980,
      isOnline: true,
      signalStrength: 88,
      lastSeen: new Date()
    },
    {
      id: 4,
      nodeId: "kengeri",
      name: "Kengeri Relief Camp",
      latitude: 12.9180,
      longitude: 77.4850,
      isOnline: true,
      signalStrength: 75,
      lastSeen: new Date(Date.now() - 1000 * 60 * 3)
    },
    {
      id: 5,
      nodeId: "hoskerehalli",
      name: "Hoskerehalli Metro Aid Point",
      latitude: 12.9300,
      longitude: 77.4900,
      isOnline: true,
      signalStrength: 82,
      lastSeen: new Date(Date.now() - 1000 * 60 * 2)
    },
    {
      id: 6,
      nodeId: "rajarajeshwari",
      name: "Rajarajeshwari Nagar Shelter",
      latitude: 12.9150,
      longitude: 77.5100,
      isOnline: false,
      signalStrength: 0,
      lastSeen: new Date(Date.now() - 1000 * 60 * 42)
    },
    {
      id: 7,
      nodeId: "banashankari",
      name: "Banashankari BDA Control",
      latitude: 12.9280,
      longitude: 77.5200,
      isOnline: true,
      signalStrength: 70,
      lastSeen: new Date(Date.now() - 1000 * 60 * 5)
    },
    {
      id: 8,
      nodeId: "jayanagar",
      name: "Jayanagar Medical Relay",
      latitude: 12.9350,
      longitude: 77.5850,
      isOnline: true,
      signalStrength: 65,
      lastSeen: new Date(Date.now() - 1000 * 60 * 7)
    },
    {
      id: 9,
      nodeId: "vijayanagar",
      name: "Vijayanagar Metro Relay",
      latitude: 12.9750,
      longitude: 77.5380,
      isOnline: true,
      signalStrength: 78,
      lastSeen: new Date(Date.now() - 1000 * 60)
    },
    {
      id: 10,
      nodeId: "magadi-road",
      name: "Magadi Road Hospital",
      latitude: 12.9320,
      longitude: 77.4750,
      isOnline: false,
      signalStrength: 0,
      lastSeen: new Date(Date.now() - 1000 * 60 * 24)
    },
    {
      id: 11,
      nodeId: "nandini-layout",
      name: "Nandini Layout Supply Node",
      latitude: 12.9380,
      longitude: 77.4920,
      isOnline: true,
      signalStrength: 85,
      lastSeen: new Date(Date.now() - 1000 * 40)
    },
    {
      id: 12,
      nodeId: "peenya",
      name: "Peenya Industrial Backup Relay",
      latitude: 13.0280,
      longitude: 77.5200,
      isOnline: true,
      signalStrength: 72,
      lastSeen: new Date(Date.now() - 1000 * 60 * 6)
    }
  ],
  connections: [
    {
      id: 1,
      fromNodeId: "user",
      toNodeId: "rv-gate",
      distance: 0.2,
      latency: 25,
      isActive: true
    },
    {
      id: 2,
      fromNodeId: "user",
      toNodeId: "mysore-road",
      distance: 0.5,
      latency: 35,
      isActive: true
    },
    {
      id: 3,
      fromNodeId: "user",
      toNodeId: "hoskerehalli",
      distance: 1.8,
      latency: 65,
      isActive: true
    },
    {
      id: 4,
      fromNodeId: "rv-gate",
      toNodeId: "mysore-road",
      distance: 0.4,
      latency: 30,
      isActive: true
    },
    {
      id: 5,
      fromNodeId: "rv-gate",
      toNodeId: "nandini-layout",
      distance: 1.2,
      latency: 50,
      isActive: true
    },
    {
      id: 6,
      fromNodeId: "mysore-road",
      toNodeId: "kengeri",
      distance: 2.1,
      latency: 75,
      isActive: true
    },
    {
      id: 7,
      fromNodeId: "mysore-road",
      toNodeId: "magadi-road",
      distance: 1.5,
      latency: 60,
      isActive: false
    },
    {
      id: 8,
      fromNodeId: "mysore-road",
      toNodeId: "banashankari",
      distance: 2.8,
      latency: 90,
      isActive: true
    },
    {
      id: 9,
      fromNodeId: "hoskerehalli",
      toNodeId: "nandini-layout",
      distance: 0.8,
      latency: 40,
      isActive: true
    },
    {
      id: 10,
      fromNodeId: "hoskerehalli",
      toNodeId: "vijayanagar",
      distance: 4.2,
      latency: 120,
      isActive: true
    },
    {
      id: 11,
      fromNodeId: "hoskerehalli",
      toNodeId: "peenya",
      distance: 8.5,
      latency: 180,
      isActive: true
    },
    {
      id: 12,
      fromNodeId: "banashankari",
      toNodeId: "rajarajeshwari",
      distance: 1.8,
      latency: 70,
      isActive: false
    },
    {
      id: 13,
      fromNodeId: "banashankari",
      toNodeId: "jayanagar",
      distance: 4.5,
      latency: 110,
      isActive: true
    },
    {
      id: 14,
      fromNodeId: "kengeri",
      toNodeId: "rajarajeshwari",
      distance: 2.2,
      latency: 80,
      isActive: false
    },
    {
      id: 15,
      fromNodeId: "nandini-layout",
      toNodeId: "vijayanagar",
      distance: 3.8,
      latency: 100,
      isActive: true
    },
    {
      id: 16,
      fromNodeId: "vijayanagar",
      toNodeId: "jayanagar",
      distance: 3.2,
      latency: 95,
      isActive: true
    },
    {
      id: 17,
      fromNodeId: "vijayanagar",
      toNodeId: "peenya",
      distance: 5.1,
      latency: 130,
      isActive: true
    }
  ],
  messages: [
    {
      id: 1,
      senderId: "rv-gate",
      receiverId: "user",
      content: "Welcome to ResQNet! Emergency communication network is now active in your area.",
      messageType: "system",
      routingPath: ["rv-gate", "user"],
      hops: 1,
      timestamp: new Date(),
      isDelivered: false,
      encrypted: false,
      signature: null,
      senderPublicKey: null
    },
    {
      id: 2,
      senderId: "hoskerehalli",
      receiverId: "user",
      content: "Medical supplies requested at Hoskerehalli Metro aid point. Priority: saline, bandages, portable oxygen.",
      messageType: "normal",
      routingPath: ["hoskerehalli", "user"],
      hops: 1,
      timestamp: new Date(Date.now() - 1000 * 60 * 14),
      isDelivered: false,
      encrypted: false,
      signature: null,
      senderPublicKey: null
    },
    {
      id: 3,
      senderId: "banashankari",
      receiverId: "user",
      content: "Road access partially blocked near Banashankari BDA Control. Use Mysore Road relay path for dispatch updates.",
      messageType: "system",
      routingPath: ["banashankari", "mysore-road", "user"],
      hops: 2,
      timestamp: new Date(Date.now() - 1000 * 60 * 29),
      isDelivered: true,
      encrypted: false,
      signature: null,
      senderPublicKey: null
    },
    {
      id: 4,
      senderId: "vijayanagar",
      receiverId: "user",
      content: "Backup relay online. Packet loss stabilized after switching to Nandini Layout route.",
      messageType: "normal",
      routingPath: ["vijayanagar", "nandini-layout", "rv-gate", "user"],
      hops: 3,
      timestamp: new Date(Date.now() - 1000 * 60 * 48),
      isDelivered: true,
      encrypted: false,
      signature: null,
      senderPublicKey: null
    },
    {
      id: 5,
      senderId: "kengeri",
      receiverId: "user",
      content: "SOS received from relief camp perimeter. Two civilians need transport assistance.",
      messageType: "sos",
      routingPath: ["kengeri", "mysore-road", "user"],
      hops: 2,
      timestamp: new Date(Date.now() - 1000 * 60 * 66),
      isDelivered: false,
      encrypted: false,
      signature: null,
      senderPublicKey: null
    }
  ]
};

const getTableRows = (table: any): MockRow[] => {
  if (table === schema.networkNodes) return mockData.nodes;
  if (table === schema.messages) return mockData.messages;
  if (table === schema.networkConnections) return mockData.connections;
  return [];
};

const columnNameToProperty = (columnName: string): string =>
  columnName.replace(/_([a-z])/g, (_, char: string) => char.toUpperCase());

const getConditionPredicate = (condition: any) => {
  const chunks = condition?.queryChunks;
  const column = chunks?.find((chunk: any) => typeof chunk?.name === "string");
  const param = chunks?.find((chunk: any) => chunk?.constructor?.name === "Param");

  if (!column || !param) {
    return () => true;
  }

  const property = columnNameToProperty(column.name);
  return (row: MockRow) => row[property] === param.value;
};

const createSelectResult = (rows: MockRow[]) => {
  const result = [...rows] as MockRow[] & {
    where: (condition: any) => ReturnType<typeof createSelectResult>;
    orderBy: (column: any) => ReturnType<typeof createSelectResult>;
    limit: (count: number) => ReturnType<typeof createSelectResult>;
  };

  result.where = (condition: any) =>
    createSelectResult(result.filter(getConditionPredicate(condition)));

  result.orderBy = (column: any) => {
    const property = typeof column?.name === "string"
      ? columnNameToProperty(column.name)
      : undefined;

    if (!property) {
      return createSelectResult(result);
    }

    return createSelectResult(
      [...result].sort((a, b) => {
        const left = a[property];
        const right = b[property];

        if (left instanceof Date && right instanceof Date) {
          return left.getTime() - right.getTime();
        }

        if (typeof left === "number" && typeof right === "number") {
          return left - right;
        }

        return String(left ?? "").localeCompare(String(right ?? ""));
      }),
    );
  };

  result.limit = (count: number) => createSelectResult(result.slice(0, count));

  return result;
};

const getNextId = (rows: MockRow[]): number =>
  rows.reduce((maxId, row) => Math.max(maxId, Number(row.id) || 0), 0) + 1;

const normalizeInsertedRows = (table: any, data: any): MockRow[] => {
  const rows = Array.isArray(data) ? data : [data];
  const targetRows = getTableRows(table);
  let nextId = getNextId(targetRows);

  return rows.map((row) => {
    const insertedRow: MockRow = {
      ...row,
      id: row.id ?? nextId++,
    };

    if (table === schema.networkNodes) {
      insertedRow.lastSeen = row.lastSeen ?? new Date();
    }

    if (table === schema.messages) {
      insertedRow.timestamp = row.timestamp ?? new Date();
      insertedRow.isDelivered = row.isDelivered ?? false;
      insertedRow.encrypted = row.encrypted ?? false;
      insertedRow.signature = row.signature ?? null;
      insertedRow.senderPublicKey = row.senderPublicKey ?? null;
    }

    return insertedRow;
  });
};

// Mock database interface
export const db: any = {
  select: () => ({
    from: (table: any) => createSelectResult(getTableRows(table))
  }),
  insert: (table: any) => ({
    values: (data: any) => {
      const targetRows = getTableRows(table);
      const insertedRows = normalizeInsertedRows(table, data);
      targetRows.push(...insertedRows);

      return { returning: () => insertedRows };
    }
  }),
  update: (table: any) => ({
    set: (data: any) => ({
      where: (condition: any) => {
        const predicate = getConditionPredicate(condition);
        const updatedRows = getTableRows(table).filter(predicate);

        updatedRows.forEach((row) => {
          Object.assign(row, data);
        });

        return { returning: () => updatedRows };
      }
    })
  }),
  delete: (table: any) => ({
    where: (condition: any) => {
      const rows = getTableRows(table);
      const predicate = getConditionPredicate(condition);
      const deletedRows = rows.filter(predicate);

      for (let index = rows.length - 1; index >= 0; index -= 1) {
        if (predicate(rows[index])) {
          rows.splice(index, 1);
        }
      }

      return { returning: () => deletedRows };
    },
    then: (resolve: (value: unknown) => void) => {
      getTableRows(table).splice(0);
      resolve([]);
    },
  })
};

// Mock pool for compatibility
export const pool = {
  query: async (sql: string, params: any[]) => {
    console.log('Mock query:', sql, params);
    return { rows: [] };
  }
};
