const express = require("express");
const { MongoClient, ServerApiVersion } = require("mongodb");
var jwt = require("jsonwebtoken");
const app = express();
require("dotenv").config();
var cors = require("cors");
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.ictyw.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

function verifyToken(req, res, next) {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ message: "Unauthorized" });
  }
  const token = authorization.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "Forbidden" });
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    await client.connect();
    const collectionAppointments = client
      .db("doctor_pronto")
      .collection("appointment");
    const bookingCollection = client.db("doctor_pronto").collection("booking");
    const userCollection = client.db("doctor_pronto").collection("users");
    const doctorCollection = client.db("doctor_pronto").collection("doctor");

    // Booking Post
    app.post("/doctor", verifyToken, async (req, res) => {
      const doctor = req.body;
      const doc = doctor;
      const result = await doctorCollection.insertOne(doc);
      res.send(result);
    });
    // Booking Post
    app.get("/doctor", verifyToken, async (req, res) => {
      const result = await doctorCollection.find({}).toArray();
      res.send(result);
    });
    app.delete("/doctor/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const result = await doctorCollection.deleteOne(filter);
      res.send(result);
    });

    // user update api
    app.put("/users/:email", async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const options = { upsert: true };
      const user = req.body;
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      var token = jwt.sign({ email }, process.env.ACCESS_TOKEN, {
        expiresIn: "1h",
      });

      res.send({ result, token });
    });

    app.put("/user/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const updateDoc = {
        $set: { roll: "admin" },
      };

      const result = await userCollection.updateOne(filter, updateDoc);

      res.send(result);
    });

    app.get("/users", verifyToken, async (req, res) => {
      const result = await userCollection.find({}).toArray();
      res.send(result);
    });
    app.get("/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const result = await userCollection.findOne({ email: email });

      const isAdmin = result?.roll === "admin";
      res.send({ admin: isAdmin });
    });

    // Appointments get
    app.get("/appointment", async (req, res) => {
      const query = {};
      const appointment = collectionAppointments
        .find(query)
        .project({ name: 1 });
      const result = await appointment.toArray();
      res.send(result);
    });

    app.get("/available", async (req, res) => {
      const date = req.query.date;
      const appointments = await collectionAppointments.find().toArray();

      const query = { date: date };
      const booking = await bookingCollection.find(query).toArray();

      appointments.forEach((service) => {
        const bookingAppointments = booking.filter(
          (b) => b.treatment === service.name
        );

        const booked = bookingAppointments.map((a) => a.time);
        service.space = service.space.filter((s) => !booked.includes(s));
      });

      res.send(appointments);
    });

    // my items
    app.get("/my-appointment", verifyToken, async (req, res) => {
      const query = req.query.email;
      const decoded = req.decoded?.email;

      if (decoded === query) {
        const appointment = bookingCollection.find({ email: query });
        const result = await appointment.toArray();
        res.send(result);
      } else {
        return res.status(403).send({ message: "Forbidden" });
      }
    });

    // Booking Post
    app.post("/booking", async (req, res) => {
      const booking = req.body;
      const query = {
        treatment: booking.treatment,
        date: booking.date,
        email: booking.email,
      };

      const exists = await bookingCollection.findOne(query);

      if (exists) {
        return res.send({ success: false, booking: exists });
      }
      const doc = booking;
      const result = await bookingCollection.insertOne(doc);
      res.send({ success: true, result });
    });
  } finally {
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Doctor Pronto listening on port ${port}`);
});
