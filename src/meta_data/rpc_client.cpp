#include "./gen-cpp/RPC.h"
#include <thrift/protocol/TBinaryProtocol.h>
#include <thrift/protocol/TCompactProtocol.h>
#include <thrift/transport/TSocket.h>
#include <thrift/transport/TTransportUtils.h>
#include <vector>

#ifdef __cplusplus
extern "C" {
    using namespace ::apache::thrift;
    using namespace ::apache::thrift::protocol;
    using namespace ::apache::thrift::transport;
    using boost::shared_ptr;
    using namespace std;
    typedef pair<string, RPCClient *> OSDPair;
    vector<OSDPair> OSDVector;
    
    int add_client(const char *host)
    {
        OSDPair p = make_pair(host, (RPCClient *)NULL);
        OSDVector.insert(OSDVector.begin(), p);
        return 0;
    }

    int find_client(const char *path) 
    { 
        return 0; 
    }

    RPCClient* get_client(int fd)
    {
        vector<OSDPair>::iterator it = OSDVector.begin() + fd;
        RPCClient *client = it->second;

        if (!client) {
            string osd = it->first;
            string host = osd;
            ulong port = 9090;

            unsigned found = osd.find_last_of(":");
            if (found) {
                host = osd.substr(0,found);
                port = atoi(osd.substr(found + 1).c_str());
            }
            fprintf(stderr, "create rpc to %s:%lu\n", host.c_str(), port);

            shared_ptr<TSocket> socket(new TSocket(host, port));
            shared_ptr<TTransport> transport(new TBufferedTransport(socket));
            shared_ptr<TProtocol> protocol(new TBinaryProtocol(transport));
            client = new RPCClient(protocol);
            it->second = client;
            transport->open();
        }
        return client;
    }
    

    int write_to_client(int fd, const char *path, 
                        const char *data, ulong offset, ulong size) 
    {
        RPCClient* client = get_client(fd);
        ulong written = 0;
        WriteArg arg;
        WriteRes res;
        try {
            while (written < size){
                char *buf = (char *)data + written;
                string str(buf, size - written);
                arg.__set_key(path);
                arg.__set_offset(offset + written);
                arg.__set_len(size - written);
                arg.__set_data(str);
                client->send_write(arg);
                //FIXME: catch exception
                client->recv_write(res);
                if (!res.status){
                    fprintf(stderr, "write recv: status %d len %lu\n", res.status, res.len);
                    written += res.len;
                    if (!res.len)
                        break;
                }
                else{
                    fprintf(stderr, "write recv: status %d\n", res.status);
                    break;
                }
            }
        } catch (...) {
            fprintf(stderr, "write: ERROR\n");
            return -EIO;
        }

        return (int)written;
    }

    int read_from_client(int fd, const char *path, 
                         ulong offset, ulong size, 
                         char *data)
    {
        RPCClient* client = get_client(fd);
        ReadArg arg;
        ReadRes res;
        arg.__set_key(path);
        arg.__set_offset(offset);
        arg.__set_len(size);
#if 0
        client->send_read(arg);   
        //FIXME: catch exception
        client->recv_read(res);
#else
        try {
            client->read(res, arg);
        } catch (...) {
            fprintf(stderr, "read recv: ERROR\n");
            return -EIO;
        }
#endif
        if (!res.status){            
            fprintf(stderr, "read recv: status %d len %lu\n", res.status, res.len);
            ulong len = (res.len > size) ? size : res.len;
            memcpy(data, res.data.data(), len);
            return (int)len;
        }
        else{
            fprintf(stderr, "ERROR: read recv: status %d\n", res.status);
            return res.status;
        }
    }

    int mkdir_on_client(int fd, const char *path, uint mode)
    {
        RPCClient* client = get_client(fd);
        MkdirArg arg;
        arg.__set_key(path);
        arg.__set_mode(mode);
        client->send_mkdir(arg);
        MkdirRes res;

        //FIXME: catch exception
        client->recv_mkdir(res);
        fprintf(stderr, "read recv: status %d\n", res.status);
        return res.status;
    }

    int truncate_on_client(int fd, const char *path, ulong newSize)
    {
        RPCClient* client = get_client(fd);
        TruncateArg arg;
        TruncateRes res;
        arg.__set_key(path);
        arg.__set_newSize(newSize);
        try {
            client->send_truncate(arg);

            //FIXME: catch exception
            client->recv_truncate(res);
        } catch (...) {
            fprintf(stderr, "truncate recv: ERROR\n");
            return -EIO;
        }

        fprintf(stderr, "read recv: status %d\n", res.status);
        return res.status;
    }
}
#endif
