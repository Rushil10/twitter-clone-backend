const admin = require('firebase-admin');
const firebase = require('firebase');

const db=firebase.firestore();

admin.initializeApp();

module.exports={admin,db};