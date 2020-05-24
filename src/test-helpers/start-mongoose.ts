import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

export default async () => {
  const mongoServer = new MongoMemoryServer();
  const uri = await mongoServer.getUri();
  const mongooseOptions = {
    useUnifiedTopology: true,
    useNewUrlParser: true,
    useFindAndModify: false,
    useCreateIndex: true,
  };

  await mongoose.connect(uri, mongooseOptions);
  return mongoServer;
};
