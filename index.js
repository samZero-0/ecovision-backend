
const express = require("express");
// const cookieParser = require('cookie-parser');
const app = express();
const cors = require("cors");
const dotenv = require("dotenv");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
dotenv.config();    
const port = process.env.PORT || 5000;
// const jwt = require('jsonwebtoken');
// const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);





app.use(cors(
    {
        origin: [
            'http://localhost:5173',
            'http://localhost:5174',
            'http://localhost:5175',
            'https://assignemnt-12.web.app'
            

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
      
        // const ordersCollection = database.collection('orders');


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

        
        
        app.get('/banners', async (req,res)=>{
            const result = await bannerCollection.find().toArray();
            res.send(result);
        })

      

       
        
        
        app.post('/create-payment-intent', async (req, res) => {    
            const { price } = req.body;
            const amount = Math.round(price * 100); 
        
            try {
                const paymentIntent = await stripe.paymentIntents.create({
                    amount: amount,
                    currency: 'usd',
                    payment_method_types: ['card'],
                });
        
                res.send({
                    client_secret: paymentIntent.client_secret, 
                });
            } catch (error) {
                console.error('Payment intent creation error:', error);
                res.status(500).send({ error: 'Failed to create payment intent' });
            }
        });   



     
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
                role: newUser.role || 'user',
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
