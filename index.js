const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
// const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');


//config
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;


//middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    "https://medihouse.netlify.app",
    // server-side
  ],
  credentials: true,
  optionsSuccessStatus: 200,
}));
app.use(express.json());
// app.use(cookieParser());

// jwt validation middleware
const verifyToken = (req, res, next) => {

  const token = req?.cookies?.token;
  // console.log(token)

  if (!token) {
    return res.status(401).send({ message: 'Unauthorized access...' });
  }

  if (token) {
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      if (err) {
        console.log(err)
        return res.status(401).send({ message: 'Unauthorized access' });
      }
      // console.log(decoded)
      req.user = decoded
      next()
    })
  }
}

//creating Token
app.post("/jwt", async (req, res) => {
  const user = req.body;
  console.log("user for token", user);
  const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET);

  res
    // .cookie("token", token, cookieOptions)
    .send({ success: true });
});

//clearing Token
app.get("/logout", async (req, res) => {
  const user = req.body;
  console.log("logging out", user);
  res
    // .clearCookie("token", { ...cookieOptions, maxAge: 0 })
    .send({ success: true });
});

//routes
app.get('/', (req, res) => {
  res.send('Server is running');
});

app.listen(port, () => {
  console.log(`Server listening on port: ${port}`);
});


//connection to mongodb

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.pqvcpai.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;




// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();


    // =================================
    // DB Collections Connection
    // =================================
    const usersCollection = client.db("mediHouseDB").collection("users");


    // =================================
    // API Connections
    // =================================

    // Get a specific users' data by email
    app.get('/users/:email', async (req, res) => {      
      // data find
      const mail = req.params?.email;
      const results = await usersCollection.find({ email: mail }).toArray();
      res.send(results);
    });

    // Post users registration data
    app.post('/users', async (req, res) => {
      const newUser = req.body;
      // console.log(newUser);
      const result = await usersCollection.insertOne(newUser);
      // console.log(result);
      res.send(result);
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);
