var thrift = require('thrift');

var RPC = require('./gen-nodejs/RPC.js'),
    ttypes = require('./gen-nodejs/rpc_types');

var connection = thrift.createConnection('localhost', 9090),
    client = thrift.createClient(RPC, connection);

var arg = new ttypes.ShowArg({key: "test"});

connection.on('error', function(err) {
	console.error(err);
    });

client.show(arg, function(err, response) {
	if (err) {
	    console.error(err);
	} else {
	    console.log("show:", arg.key);
	}
    });
