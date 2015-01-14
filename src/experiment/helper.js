var redis = require("redis");
var client;
var root = "";

module.exports = 
{
    init: function()
    {
        client = redis.createClient();

        client.on("error", function (err) {
                console.log("Redis " + err);
                process.exit();
            });
    },

    destroy: function()
    {
        client.quit();
    },

    getParent: function (path)
    {
        var n = path.lastIndexOf("/\\");
        if (n < 0) return "/";
        return path.substring(0, n);
    },

    getFile:  function (path)
    {
        var n = path.lastIndexOf("/\\");
        if (n < 0) return path;
        return path.substring(n + 1);
    },

    setRoot: function(path)
    {
        root = path;
    },

    getNewInode: function (inode, cb, arg)
    {
        var key = root + ":INODE";
        var inode = 0;
        client.incr(key, function(err, reply) {
            cb(reply, arg);
            });
    },

    Path2Inode: function(path, arg, cb, cb2)
    {
        var key = root + ":INODE:" + path;
        client.get(key, function (err, reply) {
                cb(reply, arg, cb2);
            });
    },

    SetInode: function(path, ino)
    {
        var key = root + ":INODE:" + path;
        client.set(key, ino);
    },

    AddDirEntry:  function(parent, file)
    {
        var key = root + ":DIR:" + parent;
        client.lpush(key, file);
    },

    SetAttr: function(statbuf)
    {
        var key = root + ":ATTR_N:INODE:" + statbuf.st_ino;
        client.hmset(key, 
                     "GID", statbuf.st_gid,
                     "UID", statbuf.st_uid, 
                     "LINK", statbuf.st_nlink,
                     "MODE", statbuf.st_mode);

        if (statbuf.st_atime && statbuf.st_mtime && statbuf.st_ctime) {
            key = root + ":ATTR_V:INODE:" + statbuf.st_ino;
            client.hmset(key,
                         "ATIME", statbuf.st_atime,
                         "MTIME", statbuf.st_mtime,
                         "CTIME", statbuf.st_ctime);
        }
        if (statbuf.st_mode & S_IFREG) {
            key = root + ":ATTR_V:INODE:" + statbuf.st_ino;
            client.hmset(key,
                         "SIZE", statbuf.st_size);
        }
    },

    Getattr_cb: function(inode, statbuf, cb)
    {
        console.log("calling getattr_cb");
        if (inode == 0) {
            return -1;
        }
        var key =  root + ":ATTR_N:INODE:" + inode;
        client.hmget(key, "GID", "UID", "LINK", "MODE",
                     function (err, reply) {
                         statbuf.st_gid   = reply[0];
                         statbuf.st_uid   = reply[1];
                         statbuf.st_nlink = reply[2];
                         statbuf.st_mode  = reply[3];
                         key =  root + ":ATTR_N:INODE:" + inode;
                         client.hmget(key, 
                                      "ATIME", "CTIME", "MTIME", "SIZE",
                                      function (err, reply) 
                                      {
                                          statbuf.st_atime  = reply[0];
                                          statbuf.st_ctime  = reply[1];
                                          statbuf.st_mtime  = reply[2];
                                          /*
                                          if (statbuf.st_mode & S_IFREG) {
                                              statbuf.st_size  = reply[3];
                                          };
                                          */
                                          cb(0, statbuf);
                                      })});
    },

    Getattr: function(path, cb, cb2, statbuf) 
    {
        console.log("calling getattr path " + path);
        console.log("compare " + (path == "/"));
        if (path == "/")
        {
            var time = new Date();
            statbuf.st_mtime = time;
            statbuf.st_atime = time;
            statbuf.st_ctime = time;
            /*statbuf.st_mode = S_IFDIR | 0755;*/
            statbuf.st_nlink = 1;
            cb2(0, statbuf);
        }

        this.Path2Inode(path, statbuf, cb, cb2);
        return 0;
    },
};
