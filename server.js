var express = require('express');
var fs = require('fs');
var path = require('path');
var serveStatic = require('serve-static');
var PouchDB = require('pouchdb-node');
var db = new PouchDB('mydb');
app = express();
app.use (function (req, res, next) {
    if (req.secure || req.get('x-forwarded-proto') == 'https' || !process.env.NODE_ENV) {
        next();
    } else {
        res.redirect('https://' + req.headers.host + req.url);
    }
});
app.use(serveStatic(__dirname + "/dist"));
app.post('/output', function(request, respond) {
    var filepath = __dirname + "/dist/input";
    if(fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
    }
    var writeStream = fs.createWriteStream(filepath);
    request.pipe(writeStream);

    request.on('end', function (){
       respond.end();
    });
});
app.post('/hotpotato-track', express.raw({ type:'*/*', limit: '100mb' }))
app.post('/hotpotato-track', async function(request, respond) {
    var doc = 
    {
        _attachments: {
          baseTrack: {
            content_type: "raw",
            data: request.body
          }
        }
    };
    var obj = await db.post(doc);
    respond.json(obj);
})
app.put('/hotpotato-track/:id/:rev', express.raw({ type:'*/*', limit: '100mb' }))
app.put('/hotpotato-track/:id/:rev', async function(request,response) {
    var obj = await db.putAttachment(request.params.id, 'baseTrack', request.params.rev, request.body, 'raw');
    response.json(obj);
})
app.put('/hotpotato-meta', express.json({ type:'*/*', limit: '100kb' }))
app.put('/hotpotato-meta', async function(request, respond) {
    console.log(request.body)
    if(typeof request.body.title === 'string'
    && typeof request.body.lyrics === 'string') {
        var original = await db.get(request.body._id);
        var replacement = original;
        replacement._rev = request.body._rev;
        replacement.title = request.body.title;
        replacement.lyrics = request.body.lyrics;
        var obj = await db.put(replacement)
        console.log(obj)
    }
    respond.json(obj);
})
app.get('/hotpotato/:id', async function(request,response) {
    var buffer = await db.getAttachment(request.params.id,'baseTrack')
    response.send(buffer);
});
app.get('/hotpotato-meta/:id', async function(req,res) {
    const doc = await db.get(req.params.id);
    res.json(doc);
});
app.post('/log', express.raw({ type:'*/*' }));
app.post('/log', function(request, respond) {
    var filepath = __dirname + "/dist/log";

    fs.appendFileSync(filepath, request.body + '\n');

    respond.end();
});
app.get('/dbTest', async function(request,respond) {
    // var todo = {
    //     _id: new Date().toISOString(),
    //     title: "Hi world",
    //     completed: false
    // };
    // db.put(todo, function callback(err, result) {
    //     if (!err) {
    //         console.log('Successfully posted a todo!');
    //     }
    // });
    // db.allDocs({include_docs: true, descending: true}, function(err, doc) {
    //     console.log(doc.rows)
    // })
    //var buffy = await db.getAttachment('3b363d4a-c432-4fbd-ada8-eff224556c2b','baseTrack')
    db.get('3b363d4a-c432-4fbd-ada8-eff224556c2b').then(function(doc) {
        console.log(doc);
    })
    // await db.put({
    //     _id: '2020-05-27T22:33:42.614Z',
    //     _rev: '1-39fe71c673a67a816f6e0f3cf6031ee3',
    //     title: "Hi world",
    //     completed: false
    // })
    //respond.end();
    respond.send(buffy);
})
var port = process.env.PORT || 5000;
app.listen(port);