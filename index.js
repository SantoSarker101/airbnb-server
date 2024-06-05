const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const port = process.env.PORT || 5000

// middleware
const corsOptions = {
  origin: '*',
  credentials: true,
  optionSuccessStatus: 200,
}
app.use(cors(corsOptions))
app.use(express.json())

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xrsgd45.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;


const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
})

async function run() {
  try {
    const usersCollection = client.db('airbnbDb').collection('users')
    const roomsCollection = client.db('airbnbDb').collection('rooms')
    const bookingsCollection = client.db('airbnbDb').collection('bookings')


    // Save User email and role in DB
    app.put('/users/:email', async(req,res) => {
      const email = req.params.email
      const user = req.body
      const query = { email: email }
      const option = { upsert: true }
      const updateDoc = {
        $set: user,
      }
      const result = await usersCollection.updateOne(query, updateDoc, option)
      console.log(result);
      res.send(result)
    })


    // get User
    app.get('/users/:email', async (req, res) => {
      const email = req.params.email
      const query = { email: email }
      const result = await usersCollection.findOne(query)
      console.log(result);
      res.send(result)
    })



    // Get all rooms
    app.get('/rooms', async (req, res) => {
      const result = await roomsCollection.find().toArray()
      res.send(result);
    })



    // Get a single room
    app.get('/room/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await roomsCollection.findOne(query)
      console.log(result);
      res.send(result)
    })



    // Get filtered rooms for hosts
    app.get('/rooms/:email', async (req, res) => {
      const email = req.params.email
      const query = { 'host.email': email }
      const result = await roomsCollection.find(query).toArray()
      console.log(result);
      res.send(result);
    })



    // Save a room in database
    app.post('/rooms', async (req, res) => {
      const room = req.body;
      console.log(room);
      const result = await roomsCollection.insertOne(room)
      console.log(result);
      res.send(result)
    })


    // update room booking status
    app.patch('/rooms/status/:id', async (req, res) => {
      const id = req.params.id
      const status = req.body.status
      const query = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: {
          booked: status,
        }
      }
      const update = await roomsCollection.updateOne(query, updateDoc)
      res.send(update);
    })



    // Delete rooms
    app.delete('/rooms/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await roomsCollection.deleteOne(query)
      res.send(result)
    })




    // Get Bookings for Guest
    app.get('/bookings', async (req, res) => {
      const email = req.query.email

      if(!email){
        res.send
      }
      const query = { 'guest.email': email }
      const result = await bookingsCollection.find(query).toArray()
      res.send(result);
    })



    // Save a Booking in Database
    app.post('/bookings', async (req, res) => {
      const booking = req.body;
      console.log(booking);
      const result = await bookingsCollection.insertOne(booking)
      console.log(result);
      res.send(result)
    })



    // Delete a  Booking
    app.delete('/bookings/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await bookingsCollection.deleteOne(query)
      res.send(result)
    })



    // Send a ping to confirm a successful connection
    await client.db('admin').command({ ping: 1 })
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    )
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir)

app.get('/', (req, res) => {
  res.send('AirBNB Server is running..')
})

app.listen(port, () => {
  console.log(`AirBNB is running on port ${port}`)
})