/**
 * @Author: John Isaacs <john>
 * @Date:   01-Mar-19
 * @Filename: server.js
 * @Last modified by:   john
 * @Last modified time: 02-Mar-2020
 */



const MongoClient = require('mongodb').MongoClient; //npm install mongodb@2.2.32
const url = "mongodb://localhost:27017/profiles";
const express = require('express'); //npm install express
const session = require('express-session'); //npm install express-session
const bodyParser = require('body-parser'); //npm install body-parser
const app = express();

//this tells express we are using sesssions. These are variables that only belong to one user of the site at a time.
app.use(session({
  secret: 'example'
}));

//code to define the public "static" folder
app.use(express.static('public'))

//code to tell express we want to read POSTED forms
app.use(bodyParser.urlencoded({
  extended: true
}))

// set the view engine to ejs
app.set('view engine', 'ejs');

//variable to hold our Database
var db;

//this is our connection to the mongo db, ts sets the variable db as our database
MongoClient.connect(url, function (err, database) {
  //code here picks up the error
  if(!err){
    //if there is no error dont connect to the database
    db = database; 
  }
  else{
    //if there is an error note the error to console.
    console.log("error connecting to databse "+err)
  }
  app.listen(8080);
  console.log('listening on 8080');
 
});


//********** GET ROUTES - Deal with displaying pages ***************************

//this is our root route
app.get('/', function (req, res) {

  //if there is no database
  if(!db){
    //render the error page
    res.render('pages/error');
    //and don't do anything else
    return;
  }
  //if the user is not logged in redirect them to the login page
  if (!req.session.loggedin) {
    res.redirect('/login');
    return;
  }

  //otherwise perfrom a search to return all the documents in the people collection
  db.collection('people').find().toArray(function (err, result) {
    //if there is an error doing the user search
    if(err){
      //render the bad error page and passdown the error
      res.render('pages/baderror',{error:err} );
      return;
    }

    var currentuser = req.session.currentuser;
    db.collection('content').findOne(function (err, userresult) {
      //the result of the query is sent to the users page as the "users" array
      res.render('pages/users', {
        content: content,
        user: userresult
      })
    });
  });

});

//this is our login route, all it does is render the login.ejs page.
app.get('/login', function (req, res) {
  //console.log(req);
  //test = "nothing";
  res.render('pages/login');
});




app.get('/addcontent', function (req, res) {
  if (!req.session.loggedin) {
    res.redirect('/login');
    return;
  }
  db.collection('content').findOne(function (err, userresult) {
    //the result of the query is sent to the users page as the "users" array
    
    res.render('pages/addcontent', {
      content: content
    })
  });
  
});
//remuser route simply draws our remuser page
app.get('/remuser', function (req, res) {
  if (!req.session.loggedin) {
    res.redirect('/login');
    return;
  }
  res.render('pages/remuser')
});
//logour route cause the page to Logout.
//it sets our session.loggedin to false and then redirects the user to the login
app.get('/logout', function (req, res) {
  req.session.loggedin = false;
  req.session.destroy();
  res.redirect('/');
});




//********** POST ROUTES - Deal with processing data from forms ***************************


//the dologin route detasl with the data from the login screen.
//the post variables, username and password ceom from the form on the login page.
app.post('/dologin', function (req, res) {
  console.log(JSON.stringify(req.body))
  var uname = req.body.username;
  var pword = req.body.password;



  db.collection('people').findOne({
    "login.username": uname
  }, function (err, result) {
    //if there is an error doing the user search
    if(err){
      //render the bad error page and passdown the error
      res.render('pages/baderror',{error:err} );
      return;
    } //if there is an error, throw the error
    //if there is no result, redirect the user back to the login system as that username must not exist
    if (!result) {
      res.redirect('/login');
      return
    }
    //if there is a result then check the password, if the password is correct set session loggedin to true and send the user to the index
    if (result.login.password == pword) {
      req.session.loggedin = true;
      req.session.currentuser = uname;
      res.redirect('/')
    }
    //otherwise send them back to login
    else {
      res.redirect('/login')
    }
  });
});

//the delete route deals with user deletion based on entering a username
app.post('/delete', function (req, res) {
  //check we are logged in.
  if (!req.session.loggedin) {
    res.redirect('/login');
    return;
  }
  //if so get the username variable
  var uname = req.body.username;

  //check for the username added in the form, if one exists then you can delete that doccument
  db.collection('people').deleteOne({
    "login.username": uname
  }, function (err, result) {
    //if there is an error doing the user search
    if(err){
      //render the bad error page and passdown the error
      res.render('pages/baderror',{error:err} );
      return;
    }
    //when complete redirect to the index
    res.redirect('/');
  });
});


//the adduser route deals with adding a new user
//dataformat for storing new users.

//{"_id":18,
//"gender":"female",
//"name":{"title":"miss","first":"allie","last":"austin"},
//"location":{"street":"9348 high street","city":"canterbury","state":"leicestershire","postcode":"N7N 1WE"},
//"email":"allie.austin@example.com",
//"login":{"username":"smalldog110","password":"lickit"},
//"dob":"1970-07-06 16:32:37","registered":"2011-02-08 07:10:24",
//"picture":{"large":"https://randomuser.me/api/portraits/women/42.jpg","medium":"https://randomuser.me/api/portraits/med/women/42.jpg","thumbnail":"https://randomuser.me/api/portraits/thumb/women/42.jpg"},
//"nat":"GB"}

app.post('/addcontent', function (req, res) {
  //check we are logged in
  if (!req.session.loggedin) {
    res.redirect('/login');
    return;
  }

  //we create the data string from the form components that have been passed in

  var datatostore = {
    "content": req.body.content,
  }


  //once created we just run the data string against the database and all our new data will be saved/
  db.collection('content').save(datatostore, function (err, result) {
    //if there is an error doing the user search
    if(err){
      //render the bad error page and passdown the error
      res.render('pages/baderror',{error:err} );
      return;
    }
    console.log('saved to database')
    //when complete redirect to the index
    res.redirect('/')
  })
});