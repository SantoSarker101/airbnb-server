const express = require('express')
const app = express()
const morgan = require('morgan')
const cors = require('cors')
const jwt = require('jsonwebtoken')
require('dotenv').config()
const nodemailer = require('nodemailer')
const port = process.env.PORT || 5000
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);

// middleware
const corsOptions = {
  origin: '*',
  credentials: true,
  optionSuccessStatus: 200,
}
app.use(cors(corsOptions))
app.use(express.json())
app.use(morgan('dev'))

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xrsgd45.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;


const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
})

// Verify/Validate JWT
const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization
  // console.log(authorization);
  if(!authorization){
    return res.status(401).send({ error: true, message: 'Unauthorized Access' })
  }
  const token = authorization.split(' ')[1]
  console.log(token);
  // Token Verify
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if(err){
      return res.status(401).send({ error: true, message: 'Unauthorized Access' })
    }
    req.decoded = decoded
    next()
  })

}


// send mail function
const sendMail = (emailData, emailAddress) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL,
      pass: process.env.PASS,
    }
  });

  const mailOptions = {
    from: process.env.EMAIL,
    to: emailAddress,
    subject: emailData.subject,
    html: `<p>${emailData?.message}</p>`
  };

  transporter.sendMail(mailOptions, function(error, info){
    if (error) {
   console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
      // do something useful
    }
  });
}


async function run() {
  try {
    const usersCollection = client.db('airbnbDb').collection('users')
    const roomsCollection = client.db('airbnbDb').collection('rooms')
    const bookingsCollection = client.db('airbnbDb').collection('bookings')


    // Generate Client Secret
    app.post('/create-payment-intent', verifyJWT, async (req, res) => {
      const {price} = req.body
      // console.log(price);
      if(price){
        const amount = parseFloat(price) * 100
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount,
          currency: 'usd',
          payment_method_types: ['card'],
        })
        res.send({ clientSecret: paymentIntent.client_secret })
      }
    })


    // Generate jwt token
    app.post('/jwt', (req, res) => {
      const email = req.body
      // console.log(email);
      const token = jwt.sign(email, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '900000000d'})
      // console.log(token);
      res.send({token})
    })



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
      // console.log(result);
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
      // console.log(result);
      res.send(result)
    })



    // Get filtered rooms for hosts
    app.get('/rooms/:email', verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email
      console.log(decodedEmail);
      const email = req.params.email
      if(email !== decodedEmail){
        return res.status(403).send({ error: true, message: 'Forbidden Access' })
      }

      const query = { 'host.email': email }
      const result = await roomsCollection.find(query).toArray()
      // console.log(result);
      res.send(result);
    })



    // Save a room in database
    app.post('/rooms', async (req, res) => {
      const room = req.body;
      // console.log(room);
      const result = await roomsCollection.insertOne(room)
      // console.log(result);
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



    // Update a room in Database
    app.put('/rooms/:id', verifyJWT, async (req, res) => {
      const room = req.body
      const id = req.params.id
      const filter = { _id: new ObjectId(id) }
      const options = { upsert: true }
      const updateDoc = {
        $set: room,
      }
      const result = await roomsCollection.updateOne(filter, updateDoc, options)
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



    // Get Bookings for Host
    app.get('/bookings/host', async (req, res) => {
      const email = req.query.email

      if(!email){
        res.send
      }
      const query = { host: email }
      const result = await bookingsCollection.find(query).toArray()
      res.send(result);
    })



    // Save a Booking in Database
    app.post('/bookings', async (req, res) => {
      const booking = req.body;
      console.log(booking);
      const result = await bookingsCollection.insertOne(booking)
      // console.log(result);
      sendMail({
        subject: 'Booking Successful',
        message: `Booking Id: ${result?.insertedId}, TransactionId: ${booking.transactionId}`,
      },
      booking?.guest?.email
    )


    sendMail({
      subject: 'Your Room got booked',
      message: `Booking Id: ${result?.insertedId}, TransactionId: ${booking.transactionId}`,
    },
    booking?.host
  )

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