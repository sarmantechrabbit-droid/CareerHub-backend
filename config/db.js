const mongoose = require("mongoose");
const dotenv = require("dotenv");
const dns = require("dns");
dotenv.config();

// Work around local DNS resolvers that refuse SRV lookups used by mongodb+srv URIs.
dns.setServers(["8.8.8.8", "1.1.1.1"]);
dns.setDefaultResultOrder("ipv4first");

let cachedConnection = null;
let connectingPromise = null;

const connectDB = async () => {
  if (cachedConnection) {
    return cachedConnection;
  }

  if (connectingPromise) {
    return connectingPromise;
  }

  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is not set in environment variables");
  }

  connectingPromise = mongoose
    .connect(process.env.MONGO_URI)
    .then((conn) => {
      cachedConnection = conn;
      console.log(`MongoDB Connected: ${conn.connection.host}`);
      return conn;
    })
    .catch((error) => {
      connectingPromise = null;
      throw error;
    });

  return connectingPromise;
};

module.exports = connectDB;
