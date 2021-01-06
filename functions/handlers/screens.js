const {db} = require('../util/admin');

exports.getAllScreens = (req,res) => {
  db.collection('screens').orderBy('createdAt', 'desc')
  .get()
  .then((data) => {
    let screens = []
    data.forEach((doc) => {
      screens.push({
        screenId: doc.id,
        body: doc.data().body,
        userHandle: doc.data().userHandle,
        createdAt: doc.data().createdAt,
        commentCount: doc.data().commentCount,
        likeCount: doc.data().likeCount,
        userImage:doc.data().userImage,
      })
    });
    return res.json(screens);
  })
  .catch(err => {
    console.error(err)
  })
}

exports.postOneScreen = (req,res) => {
  if(req.body.body.trim() === '') {
    return res.status(400).json({body:"Body must not be empty"});
  }
  const newScreen = {
    body:req.body.body,
    userHandle:req.user.handle,
    userImage : req.user.imageUrl,
    createdAt: new Date().toISOString(),
    likeCount: 0,
    commentCount: 0,
  }
  db.collection('screens')
    .add(newScreen)
    .then((doc) => {
      const resScreen = newScreen;
      resScreen.screenId = doc.id;
      res.json(resScreen);
    })
    .catch((err) => {
      res.status(500).json({ error: 'something went wrong' });
      console.error(err);
    });
}

exports.getScreen = (req,res) => {
  let screenData = {};
  db.doc(`/screens/${req.params.screenId}`).get()
  .then(doc => {
    if(!doc.exists) {
      return res.status(404).json({error : 'Screen not found'})
    }
    screenData = doc.data()
    screenData.screenId = doc.id;
    return db.collection('comments').orderBy('createdAt','desc').where('screenId','==',req.params.screenId).get();
  })
  .then(data => {
    screenData.comments = []
    data.forEach(doc => {
      screenData.comments.push(doc.data());
    });
    return res.json(screenData)
  })
  .catch(err => {
    console.error(err);
    return res.status(500).json({error : err.code})
  })
}

exports.commentOnScreen = (req,res) => {
  if(req.body.body.trim() === '') return res.status(400).json({comment : 'Must not be empty'})

  const newComment = {
    body : req.body.body,
    createdAt : new Date().toISOString(),
    screenId : req.params.screenId,
    userHandle : req.user.handle,
    userImage : req.user.imageUrl
  };

  db.doc(`/screens/${req.params.screenId}`).get()
  .then(doc => {
    if(!doc.exists) {
      return res.status(404).json({ error : 'Screen not found'})
    }
    return doc.ref.update({commentCount : doc.data().commentCount+1})
  })
  .then(() => {
    return db.collection('comments').add(newComment);
  })
  .then(() => {
    res.json(newComment)
  })
  .catch((err) => {
    console.error(err);
    res.status(500).json({error : 'Something went Wrong'})
  })
} 

exports.likeScreen = (req,res) => {
  const likeDocument = db.collection('likes').where("userHandle","==",req.user.handle)
  .where("screenId","==",req.params.screenId).limit(1);

  const screenDocument = db.doc(`/screens/${req.params.screenId}`);

  let screenData = {}

  screenDocument.get()
  .then(doc => {
    if(doc.exists) {
      screenData = doc.data()
      screenData.screenId = doc.id;
      return likeDocument.get()
    } else {
      return res.status(404).json({ error : 'Screen Not Found'})
    }
  })
  .then(data => {
    if(data.empty) {
      return db.collection('likes').add({
        screenId : req.params.screenId,
        userHandle : req.user.handle
      })
      .then(() => {
        screenData.likeCount++;
        return screenDocument.update({likeCount : screenData.likeCount});
      })
      .then(() => {
        return res.json(screenData);
      })
    } else {
      return res.status(400).json({ error : 'Screen already liked'})
    }
  })
  .catch(err => {
    console.error(err);
    return res.status(500).json({error : err.code})
  })
}

exports.unlikeScreen = (req,res) => {
  const likeDocument = db.collection('likes').where("userHandle","==",req.user.handle)
  .where("screenId","==",req.params.screenId).limit(1);

  const screenDocument = db.doc(`/screens/${req.params.screenId}`);

  let screenData = {}

  screenDocument.get()
  .then(doc => {
    if(doc.exists) {
      screenData = doc.data()
      screenData.screenId = doc.id;
      return likeDocument.get()
    } else {
      return res.status(404).json({ error : 'Screen Not Found'})
    }
  })
  .then(data => {
    if(data.empty) {
      return res.status(400).json({ error : 'Screen already liked'})
    } else {
      return db.doc(`/likes/${data.docs[0].id}`).delete()
      .then( () => {
        screenData.likeCount--;
        return screenDocument.update({likeCount:screenData.likeCount})
      })
      .then(() => {
        res.json(screenData);
      })
    }
  })
  .catch(err => {
    console.error(err);
    return res.status(500).json({error : err.code})
  })
}

exports.deleteScreen = (req,res) => {
  const document = db.doc(`/screens/${req.params.screenId}`);
  document.get()
  .then(doc => {
    if(!doc.exists){
      return res.status(404).json({error : 'Screen not found'})
    }
    if(doc.data().userHandle !== req.user.handle) {
      return res.status(403).json({error : 'Unauthorized'})
    } else {
      return document.delete();
    }
  })
  .then(() => {
    res.json({message : 'Screen deletd successfully'})
  })
  .catch(err => {
    console.error(err);
    return res.status(500).json({error : err.code});
  })
}