var f4js = require('fuse4js');
var fs = require('fs');
var pth = require('path');
var srcRoot = '/';
var options = {}; 
var helper = require('./helper.js');

var errnoMap = {
EPERM: 1,
ENOENT: 2,
EACCES: 13,    
EINVAL: 22,
ENOTEMPTY: 39
};

function excToErrno(exc) {
    var errno = errnoMap[exc.code];
    if (!errno)
        errno = errnoMap.EPERM; // default to EPERM
    return errno;
}


function getattr(path, cb) {
    console.log("calling " + arguments.callee.name);

    return fs.lstat(path, function lstatCb(err, stats) {
            return helper.Getattr(path, helper.Getattr_cb, cb, stats);
        });
};

function readdir(path, cb) {
    var path = pth.join(srcRoot, path);
    return fs.readdir(path, function readdirCb(err, files) {
            if (err)      
                return cb(-excToErrno(err));
            return cb(0, files);
        });
}


function readlink(path, cb) {
    var path = pth.join(srcRoot, path);
    return fs.readlink(path, function readlinkCb(err, name) {
            if (err)      
                return cb(-excToErrno(err));
            var name = pth.resolve(srcRoot, name);
            return cb(0, name);
        });
}


function chmod(path, mode, cb) {
    var path = pth.join(srcRoot, path);
    return fs.chmod(path, mode, function chmodCb(err) {
            if (err)
                return cb(-excToErrno(err));
            return cb(0);
        });
}

function convertOpenFlags(openFlags) {
    switch (openFlags & 3) {
    case 0:                    
        return 'r';              // O_RDONLY
    case 1:
        return 'w';              // O_WRONLY
    case 2:
        return 'r+';             // O_RDWR
    }
}

function open(path, flags, cb) {
    var path = pth.join(srcRoot, path);
    var flags = convertOpenFlags(flags);
    fs.open(path, flags, 0666, function openCb(err, fd) {
            if (err)      
                return cb(-excToErrno(err));
            cb(0, fd);    
        });
}


function read(path, offset, len, buf, fh, cb) {
    fs.read(fh, buf, 0, len, offset, function readCb(err, bytesRead, buffer) {
            if (err)      
                return cb(-excToErrno(err));
            cb(bytesRead);
        });
}


function write(path, offset, len, buf, fh, cb) {
    fs.write(fh, buf, 0, len, offset, function writeCb(err, bytesWritten, buffer) {
            if (err)      
                return cb(-excToErrno(err));
            cb(bytesWritten);
        });
}


function release(path, fh, cb) {
    fs.close(fh, function closeCb(err) {
            if (err)      
                return cb(-excToErrno(err));
            cb(0);
        });
}


function create (path, mode, cb) {
    var path = pth.join(srcRoot, path);
    fs.open(path, 'w', mode, function openCb(err, fd) {
            if (err)      
                return cb(-excToErrno(err));
            cb(0, fd);    
        });
}


function unlink(path, cb) {
    var path = pth.join(srcRoot, path);
    fs.unlink(path, function unlinkCb(err) {
            if (err)      
                return cb(-excToErrno(err));
            cb(0);
        });
}


function rename(src, dst, cb) {
    src = pth.join(srcRoot, src);
    dst = pth.join(srcRoot, dst);
    fs.rename(src, dst, function renameCb(err) {
            if (err)      
                return cb(-excToErrno(err));
            cb(0);
        });
}

function mkdir(path, mode, cb) {
    var path = pth.join(srcRoot, path);
    fs.mkdir(path, mode, function mkdirCb(err) {
            if (err)      
                return cb(-excToErrno(err));
            cb(0);
        });
}


function rmdir(path, cb) {
    var path = pth.join(srcRoot, path);
    fs.rmdir(path, function rmdirCb(err) {
            if (err)      
                return cb(-excToErrno(err));
            cb(0);
        });

}

function init(cb) {
    console.log("calling " + arguments.callee.name);
    console.log("File system started at " + options.mountPoint);
    console.log("To stop it, type this in another shell: fusermount -u " + options.mountPoint);
    cb();
};

function destroy(cb) {
    if (options.outJson) {
        try {
            fs.writeFileSync(options.outJson, JSON.stringify(obj, null, '  '), 'utf8');
        } catch (e) {
            console.log("Exception when writing file: " + e);
        }
    }
    console.log("File system stopped");      
    cb();
};

function statfs(cb) {
    cb(0, {
        bsize: 1000000,
                frsize: 1000000,
                blocks: 1000000,
                bfree: 1000000,
                bavail: 1000000,
                files: 1000000,
                ffree: 1000000,
                favail: 1000000,
                fsid: 1000000,
                flag: 1000000,
                namemax: 1000000
                });
};

var handlers = {
getattr: getattr,
readdir: readdir,
readlink: readlink,
chmod: chmod,
open: open,
read: read,
write: write,
release: release,
create: create,
unlink: unlink,
rename: rename,
mkdir: mkdir,
rmdir: rmdir,
init: init,
destroy: destroy,
statfs: statfs
};


function usage() {
    console.log();
    console.log("Usage: node morphFS.js [options] sourceMountPoint mountPoint");
    console.log("(Ensure the mount point is empty and you have wrx permissions to it)\n")
        console.log("Options:");
    console.log("-d                 : make FUSE print debug statements.");
    console.log();
}


function parseArgs() {
    var i, remaining;
    var args = process.argv;
    if (args.length < 4) {
        return false;
    }
    options.mountPoint = args[args.length - 1];
    options.srcRoot = args[args.length - 2];
    remaining = args.length - 4;
    i = 2;
    while (remaining--) {
        if (args[i] === '-d') {
            options.debugFuse = true;
            ++i;
        } else return false;
    }
    return true;
}


(function main() {
    if (parseArgs()) {
        helper.init();
        console.log("\nSource root: " + options.srcRoot);
        console.log("Mount point: " + options.mountPoint);
        if (options.debugFuse)
            console.log("FUSE debugging enabled");
        srcRoot = options.srcRoot;
        try {
            f4js.start(options.mountPoint, handlers, options.debugFuse);
        } catch (e) {
            console.log("Exception when starting file system: " + e);
        }
    } else {
        usage();
    }
})();
