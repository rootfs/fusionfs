#define FUSE_USE_VERSION 26

#include <fuse.h>
#include <stdio.h>
#include <getopt.h>
#include <stdarg.h>
#include <pthread.h>
#include "rpc.hpp"
#include "cppwrapper.hpp"

struct fuse_operations fusionfs_op;
#define NS "test"
volatile int force_exit = 0;

int main(int argc, char *argv[]) {
    int fuse_stat;
    char *ns = NULL;
    char *mount = "/tmp/test";

    fusionfs_op.create = cppwrap_create;
    fusionfs_op.getattr = cppwrap_getattr;
    fusionfs_op.readlink = cppwrap_readlink;
    fusionfs_op.getdir = NULL;
    fusionfs_op.mknod = cppwrap_mknod;
    fusionfs_op.mkdir = cppwrap_mkdir;
    fusionfs_op.unlink = cppwrap_unlink;
    fusionfs_op.rmdir = cppwrap_rmdir;
    fusionfs_op.symlink = cppwrap_symlink;
    fusionfs_op.rename = cppwrap_rename;
    fusionfs_op.link = cppwrap_link;
    fusionfs_op.chmod = cppwrap_chmod;
    fusionfs_op.chown = cppwrap_chown;
    fusionfs_op.truncate = cppwrap_truncate;
    fusionfs_op.utime = cppwrap_utime;
    fusionfs_op.open = cppwrap_open;
    fusionfs_op.read = cppwrap_read;
    fusionfs_op.write = cppwrap_write;
    fusionfs_op.statfs = cppwrap_statfs;
    fusionfs_op.flush = cppwrap_flush;
    fusionfs_op.release = cppwrap_release;
    fusionfs_op.fsync = cppwrap_fsync;
    fusionfs_op.setxattr = cppwrap_setxattr;
    fusionfs_op.getxattr = cppwrap_getxattr;
    fusionfs_op.listxattr = cppwrap_listxattr;
    fusionfs_op.removexattr = cppwrap_removexattr;
    fusionfs_op.opendir = cppwrap_opendir;
    fusionfs_op.readdir = cppwrap_readdir;
    fusionfs_op.releasedir = cppwrap_releasedir;
    fusionfs_op.fsyncdir = cppwrap_fsyncdir;
    fusionfs_op.access = cppwrap_access;
    fusionfs_op.init = cppwrap_init;

    int c;
    ulong port = 9999;
    char *config = "config.json";
    int debug = 0;

    while (1)
    {
        static struct option long_options[] = {
            {"debug", no_argument, 0, 'd'},
            {"help", no_argument, 0, 'h'},
            {"mount", required_argument, 0, 'm'},
            {"namespace", required_argument, 0, 'n'},
            {"port", required_argument, 0, 'p'},
            {"config", required_argument, 0, 'c'},
            {"version", no_argument, 0, 'v'},
            {0, 0, 0, 0}
        };
        int option_index = 0;

        c = getopt_long(argc, argv, "m:n:p:c:dv", long_options,
                        &option_index);

        if (c == -1)
            break;

        switch (c)
        {
        case 'v':
        case 'h':
            printf("usage: %s mountpoint\n", argv[0]);
            break;
        case 'n':
            ns = strdup(optarg);
            break;
        case 'm':
            mount = strdup(optarg);
            break;
        case 'p':
            port = atoi(optarg);
            break;
	case 'c':
	    config = strdup(optarg);
	    break;
	case 'd':
	    debug = 1;
	    break;
        default:
            printf("usage: %s mountpoint\n", argv[0]);
            exit(1);

        }
    }
    printf("rpc port %lu mount %s osd config %s\n", 
	   port, mount, config);
    constructOSD(config);
    printf("mounting file system...\n");
            
    set_Namespace(ns?ns:NS);
    
    char *fuse_argv[] = {
        "fuse-fusionfs", mount,
        "-o", "allow_other",
        "-o", "nonempty",
        "-f", 
        "-s", /* single threaded, before we can fix thrift thread safe issue */
        "-o", "debug",
        NULL
    };
    int fuse_argc = 8;
    if (debug) fuse_argc = 10;

    fuse_stat = fuse_main(fuse_argc, fuse_argv, &fusionfs_op, NULL);
    fprintf(stderr, "fuse_main returned %d\n", fuse_stat);
    free(ns);
    //free(mount);
    return fuse_stat;
}
