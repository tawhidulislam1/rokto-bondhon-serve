require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const stripe = require("stripe")(process.env.STRIPE_KEY);
var jwt = require("jsonwebtoken");

const app = express();
const port = process.env.PORT || 5000;

// middelware

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("server is working");
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.zhrby.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const userCollection = client.db("rokthoBondhon").collection("users");
    const requestCollection = client.db("rokthoBondhon").collection("bloodReq");
    const blogCollection = client.db("rokthoBondhon").collection("blog");
    const paymentCollection = client.db("rokthoBondhon").collection("payment");

    //jwt route

    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
        expiresIn: "1hr",
      });
      res.send({ token });
    });

    // use verify admin after verifyToken
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === "Admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };
    const verifyToken = (req, res, next) => {
      // console.log("inside verify token", req.headers.authorization);

      if (!req.headers.authorization) {
        return res.status(401).send({ message: "unauthorized access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
        if (err) {
          return res.status(402).send({ message: "unauthorized access" });
        }
        req.decoded = decoded;
        next();
      });
    };

    app.post("/user", async (req, res) => {
      const user = req.body;
      const result = await userCollection.insertOne(user);
      res.send(result);
    });
    app.get("/user", async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.patch("/user/status/:id", async (req, res) => {
      const id = req.params.id;
      const { status } = req.body;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: status,
        },
      };
      const result = await userCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    app.patch("/user/role/:id", async (req, res) => {
      const { id } = req.params;
      const { role } = req.body;

      const query = { _id: new ObjectId(id) };

      const updateDoc = {
        $set: {
          role: role,
        },
      };

      const result = await userCollection.updateOne(query, updateDoc);
      res.send(result);
    });
    app.get("/user/profile/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await userCollection.findOne(query);
      res.send(result);
    });
    app.patch("/user/profile/:email", async (req, res) => {
      const email = req.params.email;
      const info = req.body;

      const query = { email: email };

      const updateDoc = {
        $set: {
          name: info.name,
          image: info.image,
          bloodGroup: info.bloodGroup,
          district: info.district,
          upajela: info.upajela,
        },
      };

      const result = await requestCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    app.get("/user/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" });
      }

      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === "Admin";
      }
      res.send({ admin });
    });
    app.get("/user/volunteer/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" });
      }

      const query = { email: email };
      const user = await userCollection.findOne(query);
      let volunteer = false;
      if (user) {
        volunteer = user?.role === "Volunteer";
      }
      res.send({ volunteer });
    });
    app.delete("/user/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    app.post("/bloodReq", async (req, res) => {
      const user = req.body;
      const result = await requestCollection.insertOne(user);
      res.send(result);
    });
    app.get("/bloodReq/status", async (req, res) => {
      const query = { status: "pending" };
      const result = await requestCollection.find(query).toArray();
      res.send(result);
    });
    app.get("/bloodReq", async (req, res) => {
      const result = await requestCollection.find().toArray();
      res.send(result);
    });

    app.patch("/bloodReq/:id", async (req, res) => {
      const id = req.params.id;
      const { status } = req.body;

      const query = { _id: new ObjectId(id) };

      const updateDoc = {
        $set: {
          status: status,
        },
      };

      const result = await requestCollection.updateOne(query, updateDoc);
      res.send(result);
    });
    app.delete("/bloodReq/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };

      const result = await requestCollection.deleteOne(query);
      res.send(result);
    });
    app.get("/bloodReq/email/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await requestCollection.find(query).toArray();
      res.send(result);
    });
    app.get("/bloodReq/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await requestCollection.findOne(query);
      res.send(result);
    });
    app.patch("/bloodReq/update/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const item = req.body;
      const updateDoc = {
        $set: {
          recipientName: item.recipientName,
          requestMessage: item.requestMessage,
          donationtime: item.donationtime,
          donationDate: item.donationDate,
          bloodGroup: item.bloodGroup,
          fullAddress: item.fullAddress,
          hospitalName: item.hospitalName,
          upajela: item.upajela,
          district: item.district,
        },
      };
      const result = await requestCollection.updateOne(query, updateDoc);
      res.send(result);
    });
    app.patch("/bloodReq/donerUpdate/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const { status } = req.body;
      const item = req.body;
      const updateDoc = {
        $set: {
          donnerEamil: item.donnerEamil,
          Doonername: item.Doonername,
          status: status,
        },
      };
      const result = await requestCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    app.post("/blog", async (req, res) => {
      const body = req.body;
      const result = await blogCollection.insertOne(body);
      res.send(result);
    });
    app.get("/blog", async (req, res) => {
      const result = await blogCollection.find().toArray();
      res.send(result);
    });
    app.get("/blog/active", async (req, res) => {
      const query = { status: "publised" };
      const result = await blogCollection.find(query).toArray();
      res.send(result);
    });
    app.get("/blog/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await blogCollection.findOne(query);
      res.send(result);
    });
    app.delete("/blog/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await blogCollection.deleteOne(query);
      res.send(result);
    });
    app.patch("/blog/:id", async (req, res) => {
      const id = req.params.id;
      const { status } = req.body;

      const query = { _id: new ObjectId(id) };

      const updateDoc = {
        $set: {
          status: status,
        },
      };
      const result = await blogCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    //payment

    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      // Validate price
      if (!price || price < 0.5) {
        console.error("Invalid price:", price);
        return res
          .status(400)
          .send({ error: "Price must be at least 0.50 USD." });
      }

      const amount = Math.round(price * 100);

      const paymentInten = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentInten.client_secret,
      });
    });

    app.post("/payment", async (req, res) => {
      const payment = req.body;
      const result = await paymentCollection.insertOne(payment);

      res.send({ result });
    });
    app.get("/payment", async (req, res) => {
      const result = await paymentCollection.find().toArray();
      res.send(result);
    });
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`you app is running on ${port}`);
});
