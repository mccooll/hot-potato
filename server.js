var express = require('express');
var fs = require('fs');
var path = require('path');
var serveStatic = require('serve-static');
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
var port = process.env.PORT || 5000;
app.listen(port);