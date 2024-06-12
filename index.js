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
const verifyToken = async (req, res, next) => {

  // console.log('jtw header:', req.headers.authorization)

  const initialToken = await req.headers.authorization
  // console.log('jtw header initialToken :::>', initialToken)

  // for local storage only
  if (!initialToken) {
    return res.status(401).send({ message: 'Unauthorized access!!' });
  }
  // validate local storage token
  const token = await initialToken.split(' ')[1];

  // const token = req?.cookies?.token;
  // console.log('token :::>', token)

  if (!token) {
    return res.status(401).send({ message: 'Unauthorized access...' });
  }

  if (token) {
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      if (err) {
        console.log('err token :::>', err)
        return res.status(401).send({ message: 'Unauthorized access' });
      }
      // console.log(decoded)
      req.decoded = decoded
      next()
    })
  }
}

//creating Token
app.post("/jwt", async (req, res) => {
  const user = req.body;
  // console.log("user for token", user);
  const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '10h' });

  res
    // .cookie("token", token, cookieOptions)
    // .send({ success: true });
    .send({ token });
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
// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.pqvcpai.mongodb.net/`;




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
    await client.connect();


    // =================================
    // DB Collections' Connection
    // =================================
    const usersCollection = client.db("mediHouseDB").collection("users");
    const testsCollection = client.db("mediHouseDB").collection("tests");
    const bookingsCollection = client.db("mediHouseDB").collection("bookings");
    const bannersCollection = client.db("mediHouseDB").collection("banners");



    // =================================
    // Admin verify 
    // =================================

    // verify admin access after jwt validation
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      // console.log('from verify admin -->', email);
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const isAdmin = user?.isAdmin === true;
      if (!isAdmin) {
        return res.status(403).send({ message: "Unauthorized!!" });
      }

      next();
    }


    // =================================
    // API Connections for users
    // =================================

    // Get all users' data 
    app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
      const results = await usersCollection.find().toArray();
      // console.log(results)
      res.send(results);
    });

    // Get a specific users' data by email
    app.get('/users/:email', async (req, res) => {
      const mail = req.params?.email;
      // console.log(mail, req.decoded.email)
      // if (mail !== req.decoded.email) {
      //   res.status(403).send({ message: 'Unauthorized email access....' });
      // }
      const results = await usersCollection.find({ email: mail }).toArray();
      // console.log(results)
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

    // Patch a users' admin role by id
    app.patch('/adminRole/:id', verifyToken, verifyAdmin, async (req, res) => {
      try {
        const id = req.params?.id; // Extract the user id from the request parameters
        const updateBody = req.body; // Extract the new status from the request body
        // console.log('updateBody -->',updateBody);
        const query = { _id: new ObjectId(id) }
        const updateDoc = {
          $set: {
            isAdmin: updateBody.status
          },
        }
        const results = await usersCollection.updateOne(query, updateDoc);

        // console.log(results)
        res.send(results);
      }
      catch (err) {
        // If an error occurs during execution, catch it here
        console.error('Error updating user status:', err);
        // Send an error response to the client
        res.status(500).json({ message: 'Internal server error' });
      }
    });

    // Patch a users' data by id
    app.patch('/update_user/:id', verifyToken, verifyAdmin, async (req, res) => {
      try {
        const id = req.params?.id; // Extract the user id from the request parameters
        const updateBody = req.body; // Extract the new status from the request body
        // console.log('updateBody -->',updateBody);
        const query = { _id: new ObjectId(id) }
        const updateDoc = {
          $set: {
            status: updateBody.status
          },
        }
        const results = await usersCollection.updateOne(query, updateDoc);

        // console.log(results)
        res.send(results);
      }
      catch (err) {
        // If an error occurs during execution, catch it here
        console.error('Error updating user status:', err);
        // Send an error response to the client
        res.status(500).json({ message: 'Internal server error' });
      }
    });


    // Update users registration data by email
    app.put('/update/:email', async (req, res) => {
      // console.log(req.params?.email);
      const mail = req.params?.email;
      const request = req.body;
      const query = { email: mail };
      const options = { upsert: true };
      const data = {
        $set: {
          ...request,
        }
      }
      const result = await usersCollection.updateOne(query, data, options);
      // console.log(result);
      res.send(result);
    });

    // =================================
    // API Connections for tests
    // =================================

    // Get all tests' data 
    app.get('/tests', verifyToken, verifyAdmin, async (req, res) => {
      const results = await testsCollection.find().toArray();
      res.send(results);
    });

    // delete tests' data
    app.delete('/deleteTests/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params?.id;
      const result = await testsCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    // Update tests' data by id
    app.put('/updateTests/:id', async (req, res) => {
      // console.log(req.params?.email);
      const id = req.params?.id;
      const request = req.body;
      const query = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const data = {
        $set: {
          ...request,
        }
      }
      const result = await testsCollection.updateOne(query, data, options);
      res.send(result);
    });

    // Post a test
    app.post('/addTests', verifyToken, verifyAdmin, async (req, res) => {
      const newTest = req.body;
      // console.log(newUser);
      const result = await testsCollection.insertOne(newTest);
      // console.log(result);
      res.send(result);
    })

    // Get tests lists count for pagination
    app.get('/testsListsCount', async (req, res) => {
      const filter = req.query?.filter
      const search = req.query?.search

      let query = {
        test_name: { $regex: search, $options: 'i' },
      }
      if (filter) {
        query.test_date = { $gte: filter }; // Filter dates greater than or equal to the filter date
      }
      const counts = await testsCollection.countDocuments(query);

      // it provides a number with object form
      res.send({ counts });
    })

    // Get tests lists count for pagination with page size and page count
    app.get('/testsListPagination', async (req, res) => {
      const size = parseInt(req.query.size)
      const page = parseInt(req.query.page) - 1
      const filter = req.query?.filter
      const today = req.query?.today
      const search = req.query?.search
      // console.log(size,page);

      let query = {
        test_date: { $gte: today }, // Filter dates greater than or equal to today's date
        test_name: { $regex: search, $options: 'i' },
      }
      if (filter) {
        query = { ...query, test_date: { $gte: filter } }; // Filter dates greater than or equal to the filter date
      }

      const results = await testsCollection
        .find(query)
        .sort({ test_date: 1 }) // Sort by test_date in ascending order
        .skip(page * size)
        .limit(size)
        .toArray();

      res.send(results);
    })

    // Get tests details
    app.get('/testsLists/:id', verifyToken, async (req, res) => {
      const id = req.params?.id;
      const results = await testsCollection.find({ _id: new ObjectId(id) }).toArray();
      // console.log(results)
      res.send(results);
    })


    // =================================
    // API Connections for booking tests
    // =================================

    // get data for appointments
    app.get('/appointment/:email', verifyToken, async (req, res) => {
      const mail = req.params?.email;
      const results = await bookingsCollection.find({ userMail: mail }).toArray();
      // console.log(results)
      res.send(results);
    })

    // Patch a users' appointment Status by id
    app.patch('/appointmentStatus/:id', verifyToken, async (req, res) => {
      try {
        const id = req.params?.id; // Extract the user id from the request parameters
        const updateBody = req.body; // Extract the new status from the request body
        // console.log('updateBody -->',updateBody);
        const query = { _id: new ObjectId(id) }
        const updateDoc = {
          $set: {
            reportStatus: updateBody.status,
          },
        }
        const results = await bookingsCollection.updateOne(query, updateDoc);

        // console.log(results)
        res.send(results);
      }
      catch (err) {
        // If an error occurs during execution, catch it here
        console.error('Error updating user status:', err);
        // Send an error response to the client
        res.status(500).json({ message: 'Internal server error' });
      }
    });

    // Post a booking
    app.post('/userBookings', verifyToken, async (req, res) => {
      const booking = req.body;
      // console.log(booking);

      // check if there is already a booking
      const query = {
        userMail: booking.userMail,
        testID: booking.testID
      }

      const alreadyBooked = await bookingsCollection.findOne(query)

      if (alreadyBooked) {
        return res
          .status(400)
          .send("There is already a booking!")
      }

      const result = await bookingsCollection.insertOne(booking);
      // console.log(result);

      // update the test slots
      const updateDoc = {
        $inc: {
          test_slots: -1,
        },
      }

      const find = { _id: new ObjectId(booking.testID) }
      const updateSlots = await testsCollection.updateOne(find, updateDoc)
      // console.log(updateSlots)

      res.send(result);
    })


    // =================================
    // API Connections for banners
    // =================================

    // Get all banners' data 
    app.get('/banners', verifyToken, verifyAdmin, async (req, res) => {
      const results = await bannersCollection.find().toArray();
      res.send(results);
    });

    // get data for banners by id
    app.get('/banners/:id', verifyToken, async (req, res) => {
      const id = req.params?.id;
      const results = await bannersCollection.find({ _id: new ObjectId(id) }).toArray();
      res.send(results);
    })

    // Post banners data
    app.post('/banners', verifyToken, verifyAdmin, async (req, res) => {
      const banners = req.body;
      const result = await bannersCollection.insertOne(banners);
      res.send(result);
    })

    // Patch a banners' data by id
    app.patch('/updateBanner/:id', verifyToken, verifyAdmin, async (req, res) => {
      try {
        const id = req.params?.id; // Extract the user id from the request parameters
        const updateBody = req.body; // Extract the new status from the request body
        // console.log('updateBody -->',updateBody);

        // Check if the new status is true
        if (updateBody.status) {
          // Set isActive to false for all other banners
          await bannersCollection.updateMany(
            { _id: { $ne: new ObjectId(id) } },
            { $set: { isActive: false } }
          );
        }

        // Update the specific banner's status
        const query = { _id: new ObjectId(id) }
        const updateDoc = {
          $set: {
            isActive: updateBody.status
          },
        }
        const results = await bannersCollection.updateOne(query, updateDoc);

        // console.log(results)
        res.send(results);
      }
      catch (err) {
        // If an error occurs during execution, catch it here
        console.error('Error updating user status:', err);
        // Send an error response to the client
        res.status(500).json({ message: 'Internal server error' });
      }
    });

    // delete banner data
    app.delete('/deleteBanner/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params?.id;
      const result = await bannersCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    // =================================================================


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);
