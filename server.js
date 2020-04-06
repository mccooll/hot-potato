var express = require('express');
var fs = require('fs');
var path = require('path');
var serveStatic = require('serve-static');
app = express();
app.use(serveStatic(__dirname + "/dist"));
app.post('/output', function(request, respond) {
	var body = '';
	var filepath = __dirname + "/dist/input";
	request.on('data', function(data) {
        body += data;
    });
    request.on('end', function (){
    	if(fs.existsSync(filepath)) {
    		fs.unlinkSync(filepath);
    	}
        fs.appendFile(filepath, body, function() {
            respond.end();
        });
    });
});
var port = process.env.PORT || 5000;
app.listen(port);