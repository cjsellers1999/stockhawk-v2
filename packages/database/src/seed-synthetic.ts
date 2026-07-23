import { decodeDatabaseConfig } from "./config.js";
import { createDatabase } from "./database.js";
import { syntheticOfferObservationBatch } from "./synthetic-offer.js";

const { url } = decodeDatabaseConfig(process.env);
const database = createDatabase(url);

try {
  await database.commitObservationBatch(syntheticOfferObservationBatch);
} finally {
  await database.close();
}
