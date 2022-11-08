if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
}

const express = require('express')
const multer = require('multer')
const path = require('path')
const { response, application } = require('express');
const ejs = require('ejs');
const { format } = require('path');
var fs = require('fs')
const wav = require('wav')
const duration = require("wav-audio-length").default
const bcrypt = require('bcrypt')
const passport = require('passport')
const flash = require('express-flash')
const session = require('express-session')
const methodOverride = require('method-override')
const Datastore = require('nedb')
const localStrategy = require('passport-local').Strategy

const usersDB = new Datastore('users.db');
usersDB.loadDatabase();
const audiosDB = new Datastore('audios.db');
audiosDB.loadDatabase();

const app = express()
app.set('view-engine', 'ejs')
app.use(express.static('./public'))

app.use('*', function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*') 
  //res.header('Access-Control-Allow-Origin', 'http://www.google.com');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Content-Length, Authorization, Accept, X-Requested-With , yourHeaderFeild')
  res.header('Access-Control-Allow-Methods', 'PUT, POST, GET, DELETE, OPTIONS')
  if (req.method === 'OPTIONS') {
      res.send(200)
  } else {
      next()
  }
})

app.use(express.urlencoded({ extended: false }))
app.use(flash())
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}))
app.use(passport.initialize())
app.use(passport.session())
app.use(methodOverride('_method'))


//1. User Login/Register

const authenticateUser = (email, password, done) => {
  usersDB.findOne({email:email}, function (err, user) {
    if (user == null) {
      return done(null, false, { message: 'No user with that email' })
    } else {
      bcrypt.compare(password, user.password, function(err, result) {
        if (result) {
          return done(null, user)
        } else {
          return done(null, false, { message: 'Incorrect password.' })
        }
      })
    }})}

passport.use(new localStrategy({ usernameField: 'email' }, authenticateUser))
passport.serializeUser((user, done) => done(null, user._id))
passport.deserializeUser(function (id, done){
  usersDB.findOne({ _id: id }, function (err, user) {
    done(err, user)
  });
});

app.get('/', checkAuthenticated, (req, res) => {
  res.render('home.ejs')
})

app.get('/login', checkNotAuthenticated, (req, res) => {
  res.render('login.ejs')
})

app.post('/login', checkNotAuthenticated, passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login',
  failureFlash: true
}))

app.get('/register', checkNotAuthenticated, (req, res) => {
  res.render('register.ejs')
})

app.post('/register', checkNotAuthenticated, async (req, res) => {
  console.log(req.body)
  usersDB.find({email:req.body.email}, (err, data) => {
      if (data.length) {
          // res.send('{"msg":"Email is already registered"}')
          res.redirect('/register')
      } else {
          bcrypt.genSalt(10,function(err, salt) {
              bcrypt.hash(req.body.password, salt, function(err, crypted) {
                  if (err) {
                      res.send(err)
                  } else {
                      console.log(crypted)
                      usersDB.insert({
                          email: req.body.email,
                          password: crypted,
                          name: req.body.name
                      },()=>{
                        res.redirect('/login')
                          // res.send('{"msg":"success"}')
                      });
                  }
          })});
          }
      })
})


app.get('/logout', function (req, res){
  req.session.destroy(function (err) {
    res.redirect('/login'); 
  });
});


function checkAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next()
  }
  res.redirect('/login')
}

function checkNotAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return res.redirect('/')
  }
  next()
}




//2. Audio uploads
const storage = multer.diskStorage({
  destination: './public/uploads/',
  filename: function (req, file, cb) {
      cb(null, Date.now() + '-' + file.originalname)
  }
})
// Init Upload
const upload = multer({
  storage: storage,
  limits: {fileSize: 500000000},
  fileFilter: function (req, file, cb) {
      checkFileType(file, cb)
  }
}).single('myAudio')
// Check File Type
function checkFileType (file, cb) {
  const filetypes = /wav/
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase())
  const mimetype = filetypes.test(file.mimetype)
  if (mimetype && extname) {
      return cb(null, true)
  } else {
      cb('Error: Wav Audio Only!')
  }
}
app.get('/uploads', checkAuthenticated, (req, res) => {
  res.render('uploads.ejs')
})

app.post('/uploads',(req, res) => {
  upload(req, res, err => {
      if (err) {
          // res.end(JSON.stringify({
          //     code: 400,
          //     msg: err
          // }))
          res.render('uploads.ejs', {
            msg: 'error',
          })
      } else {
          if (typeof req.file === 'undefined') {
              // res.end(JSON.stringify({
              //     code: 401,
              //     msg: 'Error: No File Selected!'
              // }))
              res.render('uploads.ejs', {
                msg: 'Error: No File Selected!',
              })
          } else {
              const data = req.file
              data.timestamp = Date.now()
              fs.readFile(`public/uploads/${req.file.filename}`, 'binary', (err, content) => {
                  if (!err) {
                      const buffer = Buffer.from(content, 'binary')
                      data.duration = duration(buffer)
                      const f = fs.createReadStream(`public/uploads/${req.file.filename}`)
                      const reader = new wav.Reader()
                      reader.on('format', format => {
                          data.format = format
                          audiosDB.insert(data)
                          res.end(JSON.stringify({code: 200}))
                      })
                      f.pipe(reader)
                  }
              })
              console.log(data)
              res.render('uploads.ejs', {
                msg: 'File Uploaded!',
                file: `uploads/${req.file.filename}`,
                filename:req.file.originalname,
                encoding:req.file.encoding,
                size:req.file.size,
                timestamp:new Date(req.file.timestamp).toDateString()
              })
          }
      }
  })
})

// 3. Audio queries
app.get('/findAll', (req, res) => {
    audiosDB.find({}, (err, data) => {
        if (err) {
            res.send('Not Found')
            return
        }
        res.send(data)
    })
})

app.get('/find', (req, res) => {
    audiosDB.find({originalname: new RegExp(req.query.name,"ig")}, (err, data) => {
        if (err) {
            res.send('Not Found')
            return
        }
        // let audioInfo = JSON.parse(JSON.stringify(data));
        res.send(data)
    })
})

app.get('/duration', (req, res) => {
  // console.log(req.query)
  audiosDB.find({originalname: new RegExp(req.query.name,"ig")}, (err, data) => {
      if (err) {
          res.send('Not Found')
          return
      }
      // req.query.type(0:>, 1:<)
      // req.query.duration 
      res.send(data.filter(ele=>req.query.type==='0'?ele.duration > req.query.duration:ele.duration < req.query.duration))
  })
})

//delete audio
app.get('/delete_audios',(req, res) => {
  audiosDB.remove({filename: new RegExp(req.query.name,"ig")},{}, function(err, data){
    if (err) {
          res.send('Not Found')
          return
    }
    res.send('Successfully delete the audio')
  })
})



app.listen(3000)