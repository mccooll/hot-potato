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
app.post('/log', express.raw({ type:'*/*' }));
app.post('/log', function(request, respond) {
    var filepath = __dirname + "/dist/log";

    fs.appendFileSync(filepath, request.body + '\n');

    respond.end();
});
app.get('/dbTest', async function(request,respond) {
    var todo = {
        _id: new Date().toISOString(),
        title: "Hi world",
        completed: false
    };
    // db.put(todo, function callback(err, result) {
    //     if (!err) {
    //         console.log('Successfully posted a todo!');
    //     }
    // });
    // db.allDocs({include_docs: true, descending: true}, function(err, doc) {
    //     console.log(doc.rows)
    // });
    db.get('2020-05-27T22:33:42.614Z').then(function(doc) {
        console.log(doc);
    })
    await db.put({
        _id: '2020-05-27T22:33:42.614Z',
        _rev: '1-39fe71c673a67a816f6e0f3cf6031ee3',
        title: "Hi world",
        completed: false
    })
    respond.end();
})
var port = process.env.PORT || 5000;
app.listen(port);