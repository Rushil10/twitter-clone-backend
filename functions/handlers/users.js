const {admin,db} = require('../util/admin')

const firebase = require('firebase');
const { UserRecordMetadata, user } = require('firebase-functions/lib/providers/auth');

const isEmpty = (string) => {
  if(string.trim() === '') return true;
  else return false;
}

const isEmail = (email) => {
  const regEx=/^(([^<>()[]\.,;:s@"]+(.[^<>()[]\.,;:s@"]+)*)|(".+"))@(([[0-9]{1,3}.[0-9]{1,3}.[0-9]{1,3}.[0-9]{1,3}])|(([a-zA-Z-0-9]+.)+[a-zA-Z]{2,}))$/
  if(email.match(regEx)) return true;
  else return false;
}

let token,userId;

exports.signup = (req,res) => {
  const newUser={
    email:req.body.email,
    password:req.body.password,
    confirmPassword:req.body.confirmPassword,
    handle:req.body.handle,
  };
  let errors={};
  if(isEmpty(newUser.email)) {
    errors.email='Must not be empty'
  } else if(isEmail(newUser.email)) {
    errors.email='Must be valid email address'
  }
  if(isEmpty(newUser.password)) errors.password='Must not be Empty';
  if(newUser.password !== newUser.confirmPassword) errors.confirmPassword='Passwords must match';
  if(isEmpty(newUser.handle)) errors.handle='Must not be empty';

  if(Object.keys(errors).length > 0) return res.status(400).json(errors);

  const noImg='noimg.webp'

  db.doc(`/users/${newUser.handle}`).get()
  .then(doc => {
    if(doc.exists){
      return res.status(400).json({handle:'this handle is already taken'})
    } else {
      return firebase.auth().createUserWithEmailAndPassword(newUser.email,newUser.password)
    }
  })
  .then(data => {
    console.log(data);
    userId=data.user.uid;
    return data.user.getIdToken();
  })
  .then(idToken => {
    token=idToken;
    const userCredentials = {
      handle:newUser.handle,
      email:newUser.email,
      createdAt:new Date().toISOString(),
      imageUrl:`https://firebasestorage.googleapis.com/v0/b/social-10fac.appspot.com/o/${noImg}?alt=media`,
      userId:userId,
    };
    return db.doc(`/users/${newUser.handle}`).set(userCredentials);
  })
  .then(() => {
    return res.status(201).json({token})
  })
  .catch(err=>{
    console.error(err);
    if(err.code === 'auth/email-already-in-use') {
      return res.status(400).json({email: 'Email already in use '})
    } else {
      return res.status(500).json({general: 'Something went wrong, please try again'})
    }
  })
  //Validate Data
}

exports.login = (req,res) => {
  const user = {
    email:req.body.email,
    password:req.body.password
  };
  let errors={}
  if(isEmpty(user.email)) {
    errors.email='Must not be empty'
  }
  if(isEmpty(user.password)) errors.password='Must not be Empty';
  if(Object.keys(errors).length > 0) return res.status(400).json(errors);
  firebase.auth().signInWithEmailAndPassword(user.email,user.password)
  .then(data => {
    return data.user.getIdToken();
  })
  .then(token => {
    return res.json({token})
  })
  .catch(err => {
    console.error(err);
    if(err.code === 'auth/wrong-password'){
      return res.status(403).json({general: 'Wrong redentials , please try again'})
    } else {
      return res.status(500).json({error : err.code})
    }
  })
};

const reduceUserDetails = (data) => {
  console.log(data)
  let userDetails = {};
  if(!isEmpty(data.bio.trim())) userDetails.bio = data.bio;
  if(!isEmpty(data.website.trim())) {
    if(data.website.trim().substring(0,4) !== 'http'){
      userDetails.website = `http://${data.website.trim()}`;
    } else {
      userDetails.website = data.website;
    }
  }
  if(!isEmpty(data.location.trim())) userDetails.location = data.location;
  return userDetails;
}

exports.addUserDetails = (req,res) => {
  let userDetails = reduceUserDetails(req.body);
  db.doc(`/users/${req.user.handle}`).update(userDetails)
  .then(() => {
    return res.json({ message : 'Details added Successfully'})
  })
  .catch(err => {
    console.error(err)
    return res.status(500).json({error : err.code})
  })
}

exports.getAuthenticatedUser = (req,res) => {
  let userData = {}
  db.doc(`/users/${req.user.handle}`).get()
  .then(doc => {
    if(doc.exists){
      userData.credentials = doc.data()
      return db.collection('likes').where('userHandle','==',req.user.handle).get()
    }
  })
  .then(data => {
    userData.likes = []
    data.forEach(doc => {
      userData.likes.push(doc.data())
    });
    return res.json(userData);
  })
  .catch(err => {
    console.error(err)
    return res.status(500).json({error : err.code})
  })
}

exports.uploadImage = (req,res) => {
  const BusBoy = require('busboy');
  const path = require('path');
  const os = require('os')
  const fs = require('fs');

  const busboy = new BusBoy({headers : req.headers})

  let imageFileName;
  let imageToBeUploaded = {};
  
  busboy.on('file',(fieldname,file,filename,encoding,minetype) => {
    console.log(fieldname);
    console.log(filename);
    console.log(minetype);
    const imageExtension = filename.split('.')[filename.split('.').length-1];
    imageFileName=`${Math.round(Math.random()*10000000000000)}.${imageExtension}`
    const filepath = path.join(os.tmpdir(),imageFileName);
    imageToBeUploaded = {filepath,minetype} ;
    file.pipe(fs.createWriteStream(filepath));
    })
    busboy.on('finish',() => {
      admin.storage().bucket().upload(imageToBeUploaded.filepath, {
        resumable:false,
        metadata: {
          contentType: imageToBeUploaded
        }
    })
    .then(() => {
      const imageUrl = `https://firebasestorage.googleapis.com/v0/b/social-10fac.appspot.com/o/${imageFileName}?alt=media`
      return db.doc(`/users/${req.user.handle}`).update({imageUrl});
    })
    .then(() => {
      return res.json({message : 'Image uploaded successfully'})
    })
    .catch(err => {
      console.error(err)
      return res.status(500).json({ error : err.code})
    })

  });
  busboy.end(req.rawBody);
}  

exports.getUserDetails =(req,res) => {
  userData = {}
  db.doc(`/users/${req.params.handle}`).get()
  .then(doc => {
    if(doc.exists){
      userData.user = doc.data();
      return db.collection('screens').where('userHandle','==',req.params.handle)
      .orderBy('createdAt','desc')
      .get();
    } else {
      return res.status(404).json({error : 'User not found'})
    }
  })
  .then(data => {
    userData.screens = [];
    data.forEach(doc => {
      userData.screens.push({
        body:doc.data().body,
        createdAt : doc.data().createdAt,
        userHandle: doc.data().userHandle,
        userImage:doc.data().userImage,
        likeCount:doc.data().likeCount,
        commentCount:doc.data().commentCount,
        screenId:doc.id
      })
    })
    return res.json(userData)
  })
  .catch(err => {
    console.error(err);
    return res.status(500).json({error : err.code})
  })
}