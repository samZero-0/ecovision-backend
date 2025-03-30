
const express = require("express");
// const cookieParser = require('cookie-parser');
const app = express();
const cors = require("cors");
const dotenv = require("dotenv");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
dotenv.config();    
const port = process.env.PORT || 5000;
// const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);





app.use(cors(
    {
        origin: [
            'http://localhost:5173',
            'http://localhost:5174',
            'http://localhost:5175',
            'https://assignemnt-12.web.app',
            'https://ecovision-partners.vercel.app'
            

        ], 
        credentials: true,
    }
));

// app.use(cookieParser());
app.use(express.json());



// custom middleware
// const verifyToken = (req, res, next) => {
//     const token = req.cookies?.token;
//     console.log(token);
    
//     if (!token) {
//         return res.status(401).send({ message: 'Unauthorized access' })
//     }

//     jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
//         if (err) {
//             return res.status(401).send({ message: 'Token verification failed: ' + err.message })
//         }
//         // if there is no error,
//         req.user = decoded;
//         next();
//     })
// }



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.k2nj4.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;


const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

        const database = client.db('Ecovision');
        const userCollection = database.collection('users');
        const eventCollection = database.collection('events');
        const volunteerCollection = database.collection('signedUpVolunteers');
        const donationCollection = database.collection('donations');          

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();
        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        // console.log("Pinged your deployment. You successfully connected to MongoDB!");

      



        app.post('/jwt', async(req,res)=>{
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '5h'})

            res.cookie('token', token, {
                httpOnly: true,
                // secure: false,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
            })
            .send({success: true})
        })

        app.post('/logout', async(req,res)=>{
            res.clearCookie('token',{
                httpOnly: true,
                // secure: 'false',
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
            })
            .send({success: true})
        })


        // Other APIs

        


     
        app.post('/users', async (req, res) => {
            const newUser = req.body;
          
            try {
              // Validate required fields
              if (!newUser.email) {
                return res.status(400).send({ 
                  message: "Email is required",
                  success: false
                });
              }
              
              // Normalize user data
              const userToInsert = {
                displayName: newUser.name || newUser.displayName || '',
                email: newUser.email,
                photoURL: newUser.photo || newUser.photoURL || '',
                role: newUser.role || 'donor',
                createdAt: new Date()
              };
            
              const existingUser = await userCollection.findOne({ email: userToInsert.email });
          
              if (existingUser) {
                return res.status(200).send({ 
                  message: "User already exists", 
                  user: existingUser,
                  success: true 
                });
              } else {
                const result = await userCollection.insertOne(userToInsert);
                
                return res.status(201).send({ 
                  message: "User created successfully", 
                  user: {
                    ...userToInsert,
                    _id: result.insertedId
                  },
                  success: true
                });
              }
            } catch (error) {
              console.error('User creation error:', {
                message: error.message,
                stack: error.stack,
                body: req.body
              });
        
              res.status(500).send({ 
                message: "Internal server error", 
                error: error.message,
                success: false 
              });
            }
        });


        app.get('/users', async (req, res) => {

                    const result = await userCollection.find().toArray();
                    res.send(result);
                });



       

       app.patch('/users/:id', async (req, res) => {
                  const { id } = req.params;
                  const { displayName, email, photoURL, role } = req.body;
              
                  try {
                      // Validate ID format
                      if (!ObjectId.isValid(id)) {
                          return res.status(400).json({ 
                              message: 'Invalid user ID format',
                              success: false 
                          });
                      }
              
                      const updateFields = {};
                      if (displayName) updateFields.displayName = displayName;
                      if (photoURL) updateFields.photoURL = photoURL;
                      if (role) {
                          // Validate the role if provided
                          if (!['admin', 'donor', 'volunteer', 'user'].includes(role)) {
                              return res.status(400).json({ 
                                  message: 'Invalid role',
                                  success: false 
                              });
                          }
                          updateFields.role = role;
                      }
              
                      // Only proceed if there are fields to update
                      if (Object.keys(updateFields).length === 0) {
                          return res.status(400).json({ 
                              message: 'No valid fields provided for update',
                              success: false 
                          });
                      }
              
                      const filter = { _id: new ObjectId(id) };
                      const update = { $set: updateFields };
                      const options = { returnDocument: 'after' };
              
                      const result = await userCollection.findOneAndUpdate(filter, update, options);
              
                      if (!result.value) {
                          return res.status(404).json({ 
                              message: 'User not found',
                              success: false 
                          });
                      }
              
                      res.status(200).json({ 
                          message: 'User updated successfully', 
                          user: result.value,
                          success: true 
                      });
                  } catch (error) {
                      console.error('Error updating user:', error);
                      res.status(500).json({ 
                          message: 'Internal server error', 
                          error: error.message,
                          success: false 
                      });
                  }
              });

        
          

         
            app.delete('/users/:id', async (req, res) => {
              const { id } = req.params;
              
              try {
                // Check if ID is valid
                if (!ObjectId.isValid(id)) {
                  return res.status(400).json({ 
                    message: 'Invalid user ID format', 
                    success: false 
                  });
                }

                const result = await userCollection.deleteOne({ _id: new ObjectId(id) });
                
                if (result.deletedCount === 0) {
                  return res.status(404).json({ 
                    message: 'User not found',
                    success: false
                  });
                }
                
                res.status(200).json({ 
                  message: 'User deleted successfully', 
                  success: true 
                });
              } catch (error) {
                console.error('Error deleting user:', error);
                res.status(500).json({ 
                  message: 'Internal server error', 
                  error: error.message,
                  success: false 
                });
              }
            });



            // Event Management APIs
            // Add this inside your 'run' function with your other routes
            app.post('/events', async (req, res) => {
              const { title, date, time, location, attendees, status, description, image } = req.body;
              
              try {
                // Validate required fields
                if (!title || !date) {
                  return res.status(400).json({ 
                    message: "Title and date are required fields",
                    success: false
                  });
                }
                
                // Create event object with all fields
                const newEvent = {
                  title,
                  date,
                  time: time || '',
                  location: location || '',
                  attendees: attendees || 0,
                  status: status || 'Upcoming',
                  createdAt: new Date(),
                  description: description || '',
                  image: image || ''
                };
                
                // Insert the event into the database
                const result = await eventCollection.insertOne(newEvent);
                
                if (result.insertedId) {
                  return res.status(201).json({ 
                    message: "Event created successfully", 
                    event: {
                      ...newEvent,
                      _id: result.insertedId
                    },
                    success: true
                  });
                } else {
                  return res.status(500).json({ 
                    message: "Failed to create event", 
                    success: false
                  });
                }
              } catch (error) {
                console.error('Event creation error:', {
                  message: error.message,
                  stack: error.stack,
                  body: req.body
                });
                
                res.status(500).json({ 
                  message: "Internal server error", 
                  error: error.message,
                  success: false 
                });
              }
            });


           app.get('/events', async (req, res) => {

              const result = await eventCollection.find().toArray();
              res.send(result);
          });
          
          app.delete('/events/:id', async (req, res) => {
            const { id } = req.params;
            
            try {
              // Check if ID is valid
              if (!ObjectId.isValid(id)) {
                return res.status(400).json({ 
                  message: 'Invalid user ID format', 
                  success: false 
                });
              }

              const result = await eventCollection.deleteOne({ _id: new ObjectId(id) });
              
              if (result.deletedCount === 0) {
                return res.status(404).json({ 
                  message: 'Event not found',
                  success: false
                });
              }
              
              res.status(200).json({ 
                message: 'Event deleted successfully', 
                success: true 
              });
            } catch (error) {
              console.error('Error deleting event:', error);
              res.status(500).json({ 
                message: 'Internal server error', 
                error: error.message,
                success: false 
              });
            }
          });

          app.patch('/events/:id', async (req, res) => {
            const { id } = req.params;
            const updates = req.body;
            
            try {
                // Validate ID format
                if (!ObjectId.isValid(id)) {
                    return res.status(400).json({ 
                        message: 'Invalid event ID format',
                        success: false 
                    });
                }
        
                // Validate that there are fields to update
                if (!updates || Object.keys(updates).length === 0) {
                    return res.status(400).json({ 
                        message: 'No update fields provided',
                        success: false 
                    });
                }
        
                // Create filter and update document
                const filter = { _id: new ObjectId(id) };
                const updateDoc = { $set: updates };
                
                // Add updatedAt timestamp
                updateDoc.$set.updatedAt = new Date();
        
                const options = { returnDocument: 'after' };
                
                const result = await eventCollection.findOneAndUpdate(
                    filter, 
                    updateDoc, 
                    options
                );
        
                if (!result.value) {
                    return res.status(404).json({ 
                        message: 'Event not found',
                        success: false 
                    });
                }
        
                res.status(200).json({ 
                    message: 'Event updated successfully', 
                    event: result.value,
                    success: true 
                });
            } catch (error) {
                console.error('Error updating event:', {
                    error: error.message,
                    stack: error.stack,
                    params: req.params,
                    body: req.body
                });
                
                res.status(500).json({ 
                    message: 'Internal server error', 
                    error: error.message,
                    success: false 
                });
            }
        });

        app.post('/signed-up-volunteers', async (req, res) => {
          const volunteerData = req.body;
          
          try {
              // Validate required fields
              const requiredFields = [
                  'volunteerName',
                  'volunteerEmail',
                  'eventId',
                  'eventName',
                  'eventImage',
                  'volunteerImage'
              ];
              
              const missingFields = requiredFields.filter(field => !volunteerData[field]);
              
              if (missingFields.length > 0) {
                  return res.status(400).json({
                      message: `Missing required fields: ${missingFields.join(', ')}`,
                      success: false
                  });
              }
              
              // Validate email format
              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
              if (!emailRegex.test(volunteerData.volunteerEmail)) {
                  return res.status(400).json({
                      message: 'Invalid email format',
                      success: false
                  });
              }
              
              // Create volunteer document with defaults
              const newVolunteer = {
                  volunteerName: volunteerData.volunteerName,
                  volunteerEmail: volunteerData.volunteerEmail,
                  eventId: volunteerData.eventId,
                  eventName: volunteerData.eventName,
                  eventImage: volunteerData.eventImage,
                  volunteerImage: volunteerData.volunteerImage,
                  date: new Date(),
                  progress: volunteerData.progress || 0,
                  hoursCompleted: volunteerData.hoursCompleted || 0,
                  status: volunteerData.status || 'registered', // default status
                  createdAt: new Date()
              };
              
              // Insert into database
              const result = await volunteerCollection.insertOne(newVolunteer);
              
              if (result.insertedId) {
                  return res.status(201).json({
                      message: 'Volunteer registration successful',
                      volunteer: {
                          ...newVolunteer,
                          _id: result.insertedId
                      },
                      success: true
                  });
              } else {
                  return res.status(500).json({
                      message: 'Failed to register volunteer',
                      success: false
                  });
              }
          } catch (error) {
              console.error('Error registering volunteer:', {
                  message: error.message,
                  stack: error.stack,
                  body: req.body
              });
              
              res.status(500).json({
                  message: 'Internal server error',
                  error: error.message,
                  success: false
              });
          }
      });


      app.get('/signed-up-volunteers', async (req, res) => {
        try {
            const result = await volunteerCollection.find().toArray();
            res.status(200).json({
                volunteers: result,
                success: true
            });
        } catch (error) {
            console.error('Error fetching volunteers:', error);
            res.status(500).json({
                message: 'Internal server error',
                error: error.message,
                success: false
            });
        }
    });

    // Add this with your other endpoints in the run() function
app.get('/signed-up-volunteers', async (req, res) => {
  try {
      const { email } = req.query;
      
      if (!email) {
          return res.status(400).json([
              {
                  error: 'Email query parameter is required',
                  statusCode: 400
              }
          ]);
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
          return res.status(400).json([
              {
                  error: 'Invalid email format',
                  statusCode: 400
              }
          ]);
      }

      // Find all volunteers with matching email
      const volunteers = await volunteerCollection.find({ 
          volunteerEmail: email 
      }).toArray();

      res.status(200).json(volunteers);
  } catch (error) {
      console.error('Error fetching volunteers by email:', error);
      res.status(500).json([
          {
              error: 'Internal server error',
              details: error.message,
              statusCode: 500
          }
      ]);
  }
});

    // PATCH endpoint to update volunteer hours and progress
app.patch('/signed-up-volunteers/:id', async (req, res) => {
  const { id } = req.params;
  const { hoursCompleted } = req.body;

  try {
    // Validate ID format
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        message: 'Invalid volunteer ID format',
        success: false
      });
    }

    // Validate hoursCompleted is a number
    if (typeof hoursCompleted !== 'number' || hoursCompleted < 0) {
      return res.status(400).json({
        message: 'hoursCompleted must be a positive number',
        success: false
      });
    }

    const filter = { _id: new ObjectId(id) };
    const update = { 
      $set: { 
        hoursCompleted,
        progress: 'Completed',
        updatedAt: new Date()
      } 
    };
    const options = { returnDocument: 'after' };

    const result = await volunteerCollection.findOneAndUpdate(filter, update, options);

    if (!result.value) {
      return res.status(404).json({
        message: 'Volunteer record not found',
        success: false
      });
    }

    res.status(200).json({
      message: 'Volunteer record updated successfully',
      volunteer: result.value,
      success: true
    });
  } catch (error) {
    console.error('Error updating volunteer:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error.message,
      success: false
    });
  }
});

// DELETE endpoint to cancel registration
app.delete('/signed-up-volunteers/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Validate ID format
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        message: 'Invalid volunteer ID format',
        success: false
      });
    }

    const result = await volunteerCollection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        message: 'Volunteer record not found',
        success: false
      });
    }

    res.status(200).json({
      message: 'Volunteer registration cancelled successfully',
      success: true
    });
  } catch (error) {
    console.error('Error deleting volunteer:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error.message,
      success: false
    });
  }
});



      // Stripe Payment API
      app.post('/create-payment-intent', async (req, res) => {    
        const { amount, organizationId, frequency } = req.body;
        
        if (!amount || amount <= 0) {
            return res.status(400).send({ 
                error: 'Invalid amount',
                success: false 
            });
        }
        
        // Amount needs to be in cents for Stripe
        const amountInCents = Math.round(amount * 100);
        
        try {
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amountInCents,
                currency: 'usd',
                payment_method_types: ['card'],
                metadata: {
                    organizationId,
                    frequency
                }
            });
    
            res.send({
                clientSecret: paymentIntent.client_secret,
                success: true
            });
        } catch (error) {
            console.error('Payment intent creation error:', error);
            res.status(500).send({ 
                error: 'Failed to create payment intent',
                message: error.message,
                success: false 
            });
        }
    });
    
    // API to handle successful payments
    app.post('/donation-success', async (req, res) => {
        const { 
            paymentIntentId, 
            amount, 
            organizationId, 
            frequency, 
            donorEmail,
            donorName 
        } = req.body;
        
        try {
            // Verify payment with Stripe
            const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
            
            if (paymentIntent.status !== 'succeeded') {
                return res.status(400).send({
                    error: 'Payment has not succeeded',
                    success: false
                });
            }
            
            // Save donation to database
            const donation = {
                paymentIntentId,
                amount: parseFloat(amount),
                organizationId,
                frequency,
                donorEmail: donorEmail || 'anonymous',
                donorName: donorName || 'Anonymous Donor',
                createdAt: new Date(),
                status: 'completed'
            };
            
            const result = await donationCollection.insertOne(donation);
            
            res.status(201).send({
                message: 'Donation recorded successfully',
                donationId: result.insertedId,
                success: true
            });
        } catch (error) {
            console.error('Donation recording error:', error);
            res.status(500).send({
                error: 'Failed to record donation',
                message: error.message,
                success: false
            });
        }
    });
    
    // API to get donations by organization ID or donor email
    app.get('/donations', async (req, res) => {
        const { organizationId, donorEmail } = req.query;
        const query = {};
        
        if (organizationId) {
            query.organizationId = organizationId;
        }
        
        if (donorEmail) {
            query.donorEmail = donorEmail;
        }
        
        try {
            const donations = await donationCollection.find(query).toArray();
            res.send({
                donations,
                success: true
            });
        } catch (error) {
            console.error('Error fetching donations:', error);
            res.status(500).send({
                error: 'Failed to fetch donations',
                message: error.message,
                success: false
            });
        }
    });
    
    // For recurring donations, you would need a webhook to handle Stripe events
    app.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
        const signature = req.headers['stripe-signature'];
        let event;
        
        try {
            // You should set STRIPE_WEBHOOK_SECRET in your .env file
            event = stripe.webhooks.constructEvent(
                req.body,
                signature,
                process.env.STRIPE_WEBHOOK_SECRET
            );
        } catch (err) {
            console.error(`Webhook Error: ${err.message}`);
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }
        
        // Handle specific event types
        if (event.type === 'payment_intent.succeeded') {
            const paymentIntent = event.data.object;
            // Handle successful payment
            console.log('PaymentIntent succeeded:', paymentIntent.id);
            
            // Here you would record the payment in your database
            // Similar to what we do in the /donation-success endpoint
        }
        
        res.send({received: true});
    });

    } finally {
        // Ensures that the client will close when you finish/error
        //   await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Backend connected')
})

app.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
})
