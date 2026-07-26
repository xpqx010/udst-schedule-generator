import { Db, MongoClient } from "mongodb";

declare global {
  var __mongoClientPromise: Promise<MongoClient> | undefined;
}

function clientPromise() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not configured.");
  if (!global.__mongoClientPromise) {
    global.__mongoClientPromise = new MongoClient(uri, { maxPoolSize: 10 }).connect().catch((error) => {
      global.__mongoClientPromise = undefined;
      throw error;
    });
  }
  return global.__mongoClientPromise;
}

export async function database(): Promise<Db> {
  const client = await clientPromise();
  return client.db(process.env.MONGODB_DB || "udst_schedule_generator");
}
