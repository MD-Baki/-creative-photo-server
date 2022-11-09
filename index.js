const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const {
    MongoClient,
    ServerApiVersion,
    ObjectId,
    Timestamp,
} = require("mongodb");
const { timeStamp } = require("./utils/timeStamp");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.ekbqwzw.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverApi: ServerApiVersion.v1,
});

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        res.status(401).send({ message: "unauthorized access" });
    }
    const token = authHeader.split(" ")[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            res.status(403).send({ message: "forbidden access" });
        }
        req.decoded = decoded;
        next();
    });
}

async function run() {
    try {
        const serviceCollection = client
            .db("photographer")
            .collection("services");
        const reviewCollection = client
            .db("photographer")
            .collection("reviews");

        app.post("/jwt", (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: "1h",
            });
            res.send({ token });
        });

        app.post("/service", async (req, res) => {
            const service = req.body;
            const result = await serviceCollection.insertOne({
                ...service,
                createdAt: timeStamp(),
            });
            res.send(result);
        });

        app.get("/services", async (req, res) => {
            let result = null;
            if (req?.query?.limit) {
                result = await serviceCollection
                    .find({})
                    .limit(parseInt(req.query.limit))
                    .toArray();
            } else {
                result = await serviceCollection.find({}).toArray();
            }
            res.send(result);
        });

        app.get("/services/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const service = await serviceCollection.findOne(query);
            res.send(service);
        });

        app.post("/reviews", async (req, res) => {
            const review = req.body;
            const result = await reviewCollection.insertOne({
                ...review,
                createdAt: timeStamp(),
            });
            res.send(result);
        });

        app.get("/servicereview", async (req, res) => {
            const query = {};
            const cursor = reviewCollection.find(query).sort({ createdAt: -1 });
            const reviews = await cursor.toArray();
            res.send(reviews);
        });

        app.get("/reviews", verifyJWT, async (req, res) => {
            const decoded = req.decoded;

            if (decoded.email !== req.query.email) {
                res.status(403).send({ message: "unauthorized access" });
            }

            let query = {};
            if (req?.query?.email) {
                query = {
                    email: req.query.email,
                };
            }

            const cursor = reviewCollection.find(query).sort({ createdAt: -1 });
            const reviews = await cursor.toArray();
            res.send(reviews);
        });

        app.get("/reviews/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const reviewEdit = await reviewCollection.findOne(query);
            res.send(reviewEdit);
        });

        app.put("/reviews/:id", async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const editedReview = req.body;
            const option = { upsert: true };
            const updatedReview = {
                $set: {
                    rating: editedReview.rating,
                    review: editedReview.review,
                },
            };
            const result = await reviewCollection.updateOne(
                filter,
                updatedReview,
                option
            );
            res.send(result);
        });

        app.delete("/reviews/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await reviewCollection.deleteOne(query);
            res.send(result);
        });
    } finally {
    }
}
run().catch((err) => console.error(err));

app.get("/", (req, res) => {
    res.send("Creative Photo Server is running");
});

app.listen(port, () => {
    console.log(`Creative Photo server running on ${port}`);
});
