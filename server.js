var express = require('express');
var fs = require('fs');
var path = require('path');
var serveStatic = require('serve-static');
app = express();
app.use (function (req, res, next) {
	if (!process.env.NODE_ENV || req.secure) {
		next();
	} else {
		res.redirect('https://' + req.headers.host + req.url);
	}
});
app.use(serveStatic(__dirname + "/dist"));
app.post('/output', function(request, respond) {
	var body = '';
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
var port = process.env.PORT || 5000;
app.listen(port);