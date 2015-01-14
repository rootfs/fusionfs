var thrift = require('thrift');
// fix utf 8 encoding
Buffer = require('buffer').Buffer
TBinaryProtocol = require('thrift/lib/thrift/protocol').TBinaryProtocol

TBinaryProtocol.prototype.writeString = function(str) {
  str = new Buffer(str).toString('binary')
  this.writeI32(str.length);
  this.trans.write(str);
}

TBinaryProtocol.prototype.readString = function() {
  var r = this.readBinary().toString('utf8');
  return r;
}

var options = {tls: false, transport: thrift.TBufferedTransport, protocol: thrift.TBinaryProtocol};
var fs = require('fs');

var RPC = require('./gen-nodejs/RPC.js'),
    ttypes = require('./gen-nodejs/rpc_types');

var root = "/tmp/osd";

var server = thrift.createServer(RPC, {
    show: function(arg, result) {
            console.log("show:", arg.key);
            var test_showRes = new ttypes.ShowRes({status: 0,
                                                   len: 0});

            result(null, test_showRes);
        },

    mkdir: function(arg, result) {
            console.log("mkdir:", arg.key);
            var fd = fs.mkdirSync(root + arg.key, arg.mode);
            var mkdirRes = new ttypes.MkdirRes({status: 0});
            result(null, mkdirRes);
        },

    truncate: function(arg, result) {
            console.log("truncate:" + arg.key + " size " + arg.newSize);
            var path = root + arg.key;
            if (fs.existsSync(path) == false)
                fs.openSync(path, "w");
            fs.truncateSync(root + arg.key, arg.newSize);
            var truncateRes = new ttypes.TruncateRes({status: 0});
            result(null, truncateRes);
        },

    read: function(arg, result) {
            var path = root + arg.key;
            var fd = fs.open(path, "r",  function(err, fd) {
                    if (err) {
                        throw "cannot open " + path;
                    } else {
                        var sz = parseInt(arg.len, 10);
                        var off = parseInt(arg.offset, 10);
                        var buf = new Buffer(sz);
                        fs.read(fd, buf, 0, buf.length, off,  
                                 function(err, length, buffer) {
                                    console.log("read:" + arg.key + " off " + off 
                                                + " len " + arg.len + " read " + length + " buf " + buffer.length);
                                    if (length > 0) {
                                        var readRes = new ttypes.ReadRes({
                                            status: 0,
                                            len: length,
                                            data: buffer});
                                    }else {                                    
                                        console.log("ERROR: read:" + arg.key + " off " + off 
                                                    + " len " + arg.len + " read " + length + " buf " + buffer.length);

                                        var readRes = new ttypes.ReadRes({status: -1});
                                    }
                                    result(null, readRes);
                                });
                    }

                });
        },

    write: function(arg, result) {
            var path = root + arg.key;
            var buf = new Buffer(arg.data, 'utf8');
            var flag = "w+";
            if (fs.existsSync(path)){
                flag = "rs+";
            }
            var off = arg.offset + 0;
            var sz = arg.len + 0;

            if (sz > buf.length){
                sz = buf.length;
            }

            console.log("write:" + arg.key + " off " + off + " req_len " + arg.len +
                        " sz " + sz + " len " + buf.length);

            var fd = fs.open(path, flag,  function(err, fd) {
                    if (err) {
                        throw "open failed " + path;
                    } else {
                        fs.write(fd, buf, 0, sz, off,  
                                 function(err, len, buffer) {
                                     fs.close(fd);
                                     var status = 0;
                                     if (len < 0){
                                         status = -1;
                                         var writeRes = new ttypes.WriteRes({status: status});
                                         result(null, writeRes);
                                         return;
                                     }
                                     // if buffer size is less than told size, extend the file if necessary
                                     if (buf.length < arg.len) {
                                         console.log("write beyond buffer");
                                     }
                                     var writeRes = new ttypes.WriteRes({status: status,
                                                                         len: len});

                                     result(null, writeRes);
                                 });

                    }
                });
        },
    },
    options
    );

server.listen(9090);
