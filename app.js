const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const url = require('url');
const http = require('http');
const dns = require('dns');
require('dotenv').config();

const app = express();
app.use('/public',express.static('public'));
app.use(cors({optionsSuccessStatus:200}));
app.use(bodyParser.urlencoded({extended:true}));

mongoose.connect(process.env.MONGO_URI).then(()=>{
    console.log("connected to MongoDB");
});

const URLSchema = new mongoose.Schema({
    original_url:String,
    short_url:Number
});

function checkExists(hostname,callback){
  dns.resolve(hostname,(err,addresses)=>{
    if(err) callback(false);
    else callback(true);
  })
}

const URLModel = mongoose.model('URLModel',URLSchema);

app.get('/',(req,res)=>{
    res.sendFile(__dirname+'/views/index.html');
})


app.post('/api/shorturl',async(req,res)=>{
    const givenURL = req.body.givenURL;
    let hostname;
    try{
      hostname = new URL(givenURL).hostname;
    }
    catch(err){
      res.json({error:'Invalid URL'});
      return;
    }

    checkExists(hostname,async (exists)=>{
      if(exists){
        const newURL = new URLModel({
          original_url:givenURL,
          short_url:Math.floor(Math.random()*1000)
        });
        await newURL.save().then((data)=>{
          res.json({'original_url':data.original_url,'short_url':data.short_url});
        });
      }else{
        res.json({error:"Invalid Hostname"});
      }
    });
    

})

app.get('/api/shorturl/:id',async(req,res)=>{
  const data = await URLModel.findOne({short_url:req.params.id});
  if(data){
    res.redirect(data.original_url);
    return;
  }
  else{
    res.json({error:"Invalid ID"});
  }
  
})
app.listen(3000,()=>{
    console.log("Connected to server.")
})  