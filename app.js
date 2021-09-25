//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require('mongoose');
const ejs = require("ejs");
const _ = require("lodash");
const session = require('express-session');
const MongoStore =  require("connect-mongo")(session);
const passport = require("passport");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { ensureAuth, ensureGuest } = require("./middleware/auth");

const app = express();
mongoose.connect(process.env.MONGO_URI, {useNewUrlParser: true,useUnifiedTopology:true}).then((conn) =>  console.log('Suucessfully connected'));

const userSchema= new mongoose.Schema({
  googleId: {
    type: String,
    required: true,
  },
  
})
const User=mongoose.model("User",userSchema);

const postSchema= new mongoose.Schema ( {

  content: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  }
},
{
  timestamps: true,
});
// postSchema.plugin(findOrCreate);

const Post=mongoose.model("Post",postSchema);


passport.use(new GoogleStrategy(
  {
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "https://samirblogs.herokuapp.com/auth/google/callback",
  },
  async (accessToken, refreshToken, profile, done) => {
   
    const newUser = {
      googleId: profile.id,
    };
    try {
      
      const user = await User.findOne({
        googleId: profile.id,
        
      });
      if (user) {
        done(null, user);
      } else {
        const nuser = await User.create(newUser);
        done(null, nuser);
      }
    } catch (e) {
      console.error(e);
    }
  }
)
);

passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser((id, done) => {
User.findById(id, (err, user) => done(err, user));
});

//Sessions
app.use(
  session({
    secret: 'samirmorey',
    resave: false,
    saveUninitialized: false,
    maxAge: 24 * 60 * 60 * 1000 * 10,
    store: new MongoStore({ mongooseConnection: mongoose.connection }),
    unset: "destroy",
  })
);

app.use(passport.initialize());
app.use(passport.session());


const homeStartingContent = "Lacus vel facilisis volutpat est velit egestas dui id ornare. Semper auctor neque vitae tempus quam. Sit amet cursus sit amet dictum sit amet justo. Viverra tellus in hac habitasse. Imperdiet proin fermentum leo vel orci porta. Donec ultrices tincidunt arcu non sodales neque sodales ut. Mattis molestie a iaculis at erat pellentesque adipiscing. Magnis dis parturient montes nascetur ridiculus mus mauris vitae ultricies. Adipiscing elit ut aliquam purus sit amet luctus venenatis lectus. Ultrices vitae auctor eu augue ut lectus arcu bibendum at. Odio euismod lacinia at quis risus sed vulputate odio ut. Cursus mattis molestie a iaculis at erat pellentesque adipiscing.";
const aboutContent = "Hac habitasse platea dictumst vestibulum rhoncus est pellentesque. Dictumst vestibulum rhoncus est pellentesque elit ullamcorper. Non diam phasellus vestibulum lorem sed. Platea dictumst quisque sagittis purus sit. Egestas sed sed risus pretium quam vulputate dignissim suspendisse. Mauris in aliquam sem fringilla. Semper risus in hendrerit gravida rutrum quisque non tellus orci. Amet massa vitae tortor condimentum lacinia quis vel eros. Enim ut tellus elementum sagittis vitae. Mauris ultrices eros in cursus turpis massa tincidunt dui.";
const contactContent = "Scelerisque eleifend donec pretium vulputate sapien. Rhoncus urna neque viverra justo nec ultrices. Arcu dui vivamus arcu felis bibendum. Consectetur adipiscing elit duis tristique. Risus viverra adipiscing at in tellus integer feugiat. Sapien nec sagittis aliquam malesuada bibendum arcu vitae. Consequat interdum varius sit amet mattis. Iaculis nunc sed augue lacus. Interdum posuere lorem ipsum dolor sit amet consectetur adipiscing elit. Pulvinar elementum integer enim neque. Ultrices gravida dictum fusce ut placerat orci nulla. Mauris in aliquam sem fringilla ut morbi tincidunt. Tortor posuere ac ut consequat semper viverra nam libero.";


app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));



app.get("/",ensureGuest,function (req,res) {
  res.render("login");
  
});
app.get('/auth/google',
  passport.authenticate('google', { scope: ["profile"] })
  );

app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/home' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/home');
  });

app.get("/home",ensureAuth,async function (req,res) {
  try {
    const allPosts = await Post.find({ user: req.user.id }).lean();
    // console.log(req.user.createdAt)
    res.render("home", {
      startingContent: homeStartingContent,
    	posts: allPosts,
    });
  } catch (error) {
    res.render("error/500");
  }
});

app.get("/about",ensureAuth,function (req,res) {
  res.render("about",{aboutContent:aboutContent});
});
app.get("/contact",ensureAuth,function (req,res) {
  res.render("contact",{contactContent:contactContent});
});
app.get("/compose",ensureAuth,function (req,res) {
  res.render("compose");
});
app.get("/logout", (req, res) => {
  req.session = null;
  res.redirect("/");
});
app.post("/compose",ensureAuth,async function (req,res) {
  console.log(req.body)
  const post = new Post ({
    title: req.body.postTitle,
    content: req.body.postBody,
    user: req.user.id
  });
  await post.save();
  res.redirect("/home");

   });



app.get("/posts/:postId",ensureAuth,async function(req,res) {
  const requestedPostId = _.lowerCase(req.params.postId);

    Post.findOne({_id: req.params.postId
    }, function(err, post){

       res.render("post", {

         title: post.title,
         content: post.content

       });

     });

   
});

app.post("/delete",ensureAuth,function (req,res) {
  const deletepost=req.body.button;

  Post.findByIdAndRemove(deletepost, function(err){
    if (!err) {
      console.log("Successfully deleted checked item.");
      res.redirect("/home");
    }else{
      res.redirect("/home");
    }
   });
  });




app.listen(process.env.PORT, function() {
  console.log("Server started on port 3000");
});

// passport.use(new GoogleStrategy(
//   {
//     clientID: process.env.CLIENT_ID,
//     clientSecret: process.env.CLIENT_SECRET,
//     callbackURL: "http://localhost:3000/auth/google/blog",
//   },
//   async (accessToken, refreshToken, profile, done) => {
//     const newUser = {
//       googleId: profile.id,
//       displayName: profile.displayName,
//       firstName: profile.name.givenName,
//       lastName: profile.name.familyName,
//       image: profile.photos[0].value,
//     };
//     try {
//       const user = await Post.findOne({
//         googleId: profile.id,
//       });
//       if (user) {
//         done(null, user);
//       } else {
//         const nuser = await Post.create(newUser);
//         done(null, nuser);
//       }
//     } catch (e) {
//       console.error(e);
//     }
//   }
// )
// );
