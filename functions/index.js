const firebase = require('firebase');
var firebaseConfig = {
  apiKey: "AIzaSyCETcQA_4P8iXZuAAcb4C6I2YUhAugrkn8",
  authDomain: "social-10fac.firebaseapp.com",
  databaseURL: "https://social-10fac.firebaseio.com",
  projectId: "social-10fac",
  storageBucket: "social-10fac.appspot.com",
  messagingSenderId: "891246819695",
  appId: "1:891246819695:web:ff39691f0a4f9a3525d09a"
}
firebase.initializeApp(firebaseConfig);
const functions = require('firebase-functions');
const db=firebase.firestore();

const express=require('express');
const {admin} = require('./util/admin')
const app=express();

const {getAllScreens, postOneScreen, getScreen,commentOnScreen , likeScreen ,unlikeScreen,deleteScreen} = require('../functions/handlers/screens');
const { signup, login, uploadImage, addUserDetails,getAuthenticatedUser,getUserDetails } = require('./handlers/users');
const FBAuth = require('./util/FBAuth');

app.get('/screens',getAllScreens)
app.post('/screen',FBAuth,postOneScreen)
app.get('/screen/:screenId',getScreen)

//delete screen
app.delete('/screen/:screenId',FBAuth,deleteScreen);
//like a screen
app.get('/screen/:screenId/like',FBAuth,likeScreen);
//unlike a screen
app.get('/screen/:screenId/unlike',FBAuth,unlikeScreen);
//comment on screen
app.post('/screen/:screenId/comment',FBAuth,commentOnScreen);

app.post('/signup',signup)
app.post('/login',login)

app.post('/user',FBAuth,addUserDetails)
app.post('/user/image',FBAuth,uploadImage)
app.get('/user',FBAuth,getAuthenticatedUser);

app.get('/user/:handle',getUserDetails);

exports.api=functions.https.onRequest(app);

exports.onUserImageChange = functions.firestore.document('/users/{userId}')
.onUpdate((change) => {
  console.log(change.before.data());
  console.log(change.after.data());
  if(change.before.data().imageUrl !== change.after.data().imageUrl) {
    let batch = db.batch();
    return db.collection('screens').where("userHandle","==",change.before.data().handle).get()
    .then(data => {
      data.forEach(doc => {
        const screen = db.doc(`/screens/${doc.id}`);
        batch.update(screen,{userImage : change.after.data().imageUrl})
      })
      return batch.commit();
    })
  }
})

/*

exports.createNotificationOnLike = functions.firestore.document('likes/{id}')
.onCreate((snapshot) => {
  db.doc(`/screens/${snapshot.data().screenId}`).get()
  .then(doc => {
    if(doc.exists){
      return db.doc(`/notifications/${snapshot.id}`).set({
        createdAt : new Date().toISOString,
        recipient:doc.data().userHandle,
        sender:snapshot.data().userHandle,
        type:'like',
        read:false,
        screenId:doc.id
      })
    }
  })
  .then(() => {
    return;
  })
  .catch(err => {
    console.error(err);
    return;
  })
})

exports.deleteNotificationOnUnlike = functions.firestore.document('likes/{id}')
.onDelete((snapshot) => {
  db.doc(`/notifications/${snapshot.id}`)
  .delete()
  .then(() => {
    return;
  })
  .catch(err => {
    console.error(err);
    return;
  })
})

exports.createNotificationOnComment = functions.firestore.document('comments/{id}')
.onCreate((snapshot) => {
  db.doc(`/screens/${snapshot.data().screenId}`).get()
  .then(doc => {
    if(doc.exists){
      return db.doc(`/notifications/${snapshot.id}`).set({
        createdAt : new Date().toISOString,
        recipient:doc.data().userHandle,
        sender = snapshot.data().userHandle,
        type:'comment',
        read:false,
        screenId:doc.id
      })
    }
  })
  .then(() => {
    return;
  })
  .catch(err => {
    console.error(err);
    return;
  })
})
*/